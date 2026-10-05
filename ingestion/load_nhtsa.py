import os
from pathlib import Path
from datetime import datetime

import requests
from dotenv import load_dotenv
from supabase import create_client


MAKE = "BMW"
MODEL = "X3"
MODEL_YEAR = 2021

RECALL_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle"
COMPLAINT_URL = "https://api.nhtsa.gov/complaints/complaintsByVehicle"


# -----------------------------
# ENV + SUPABASE
# -----------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise ValueError("Supabase environment variables are missing.")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)


# -----------------------------
# HELPERS
# -----------------------------

def parse_date(value, date_format):
    if not value:
        return None

    try:
        return datetime.strptime(
            value,
            date_format
        ).date().isoformat()
    except ValueError:
        return None


def fetch_nhtsa(url):
    params = {
        "make": MAKE,
        "model": MODEL,
        "modelYear": MODEL_YEAR,
    }

    response = requests.get(
        url,
        params=params,
        timeout=30
    )

    response.raise_for_status()

    return response.json().get("results", [])


# -----------------------------
# MASTER DATA
# -----------------------------

def get_or_create_manufacturer():
    response = (
        supabase
        .table("manufacturers")
        .select("id")
        .eq("name", MAKE)
        .execute()
    )

    if response.data:
        return response.data[0]["id"]

    response = (
        supabase
        .table("manufacturers")
        .insert({"name": MAKE})
        .execute()
    )

    return response.data[0]["id"]


def get_or_create_vehicle_model(manufacturer_id):
    response = (
        supabase
        .table("vehicle_models")
        .select("id")
        .eq("manufacturer_id", manufacturer_id)
        .eq("model_name", MODEL)
        .execute()
    )

    if response.data:
        return response.data[0]["id"]

    response = (
        supabase
        .table("vehicle_models")
        .insert({
            "manufacturer_id": manufacturer_id,
            "model_name": MODEL,
        })
        .execute()
    )

    return response.data[0]["id"]


def get_or_create_model_year(vehicle_model_id):
    response = (
        supabase
        .table("model_years")
        .select("id")
        .eq("vehicle_model_id", vehicle_model_id)
        .eq("model_year", MODEL_YEAR)
        .execute()
    )

    if response.data:
        return response.data[0]["id"]

    response = (
        supabase
        .table("model_years")
        .insert({
            "vehicle_model_id": vehicle_model_id,
            "model_year": MODEL_YEAR,
        })
        .execute()
    )

    return response.data[0]["id"]


# -----------------------------
# RECALLS
# -----------------------------

def load_recalls(model_year_id, recalls):
    loaded = 0
    failed = 0

    for item in recalls:
        try:
            payload = {
                "model_year_id": model_year_id,
                "campaign_number":
                    item.get("NHTSACampaignNumber"),
                "component":
                    item.get("Component"),
                "summary":
                    item.get("Summary"),
                "consequence":
                    item.get("Consequence"),
                "remedy":
                    item.get("Remedy"),
                "report_received_date":
                    parse_date(
                        item.get("ReportReceivedDate"),
                        "%d/%m/%Y"
                    ),
                "raw_payload":
                    item,
            }

            (
                supabase
                .table("recalls")
                .upsert(
                    payload,
                    on_conflict="model_year_id,campaign_number"
                )
                .execute()
            )

            loaded += 1

        except Exception as exc:
            failed += 1
            print(
                "Recall failed:",
                item.get("NHTSACampaignNumber"),
                exc
            )

    return loaded, failed


# -----------------------------
# COMPLAINTS
# -----------------------------

def load_complaints(model_year_id, complaints):
    loaded = 0
    failed = 0

    for item in complaints:
        try:
            payload = {
                "model_year_id":
                    model_year_id,

                "odi_number":
                    str(item.get("odiNumber")),

                "component":
                    item.get("components"),

                "complaint_date":
                    parse_date(
                        item.get("dateComplaintFiled"),
                        "%m/%d/%Y"
                    ),

                "incident_date":
                    parse_date(
                        item.get("dateOfIncident"),
                        "%m/%d/%Y"
                    ),

                "crash":
                    item.get("crash", False),

                "fire":
                    item.get("fire", False),

                "injuries":
                    item.get("numberOfInjuries", 0),

                "deaths":
                    item.get("numberOfDeaths", 0),

                "description":
                    item.get("summary"),

                "raw_payload":
                    item,
            }

            (
                supabase
                .table("complaints")
                .upsert(
                    payload,
                    on_conflict="odi_number"
                )
                .execute()
            )

            loaded += 1

        except Exception as exc:
            failed += 1
            print(
                "Complaint failed:",
                item.get("odiNumber"),
                exc
            )

    return loaded, failed


# -----------------------------
# INGESTION MONITORING
# -----------------------------

def start_ingestion_run():
    response = (
        supabase
        .table("ingestion_runs")
        .insert({
            "source_name": "NHTSA",
            "entity_type": "vehicle_intelligence",
            "status": "RUNNING",
        })
        .execute()
    )

    return response.data[0]["id"]


def finish_ingestion_run(
    run_id,
    status,
    rows_received,
    rows_inserted,
    rows_failed,
    error_message=None,
):
    (
        supabase
        .table("ingestion_runs")
        .update({
            "status": status,
            "completed_at": datetime.utcnow().isoformat(),
            "rows_received": rows_received,
            "rows_inserted": rows_inserted,
            "rows_failed": rows_failed,
            "error_message": error_message,
        })
        .eq("id", run_id)
        .execute()
    )


# -----------------------------
# MAIN
# -----------------------------

def main():
    print("\nAutoIntel AI")
    print("-------------------------")
    print(f"Vehicle: {MODEL_YEAR} {MAKE} {MODEL}")

    run_id = start_ingestion_run()

    try:
        print("\nFetching NHTSA data...")

        recalls = fetch_nhtsa(RECALL_URL)
        complaints = fetch_nhtsa(COMPLAINT_URL)

        print(f"Recalls: {len(recalls)}")
        print(f"Complaints: {len(complaints)}")

        manufacturer_id = get_or_create_manufacturer()

        vehicle_model_id = get_or_create_vehicle_model(
            manufacturer_id
        )

        model_year_id = get_or_create_model_year(
            vehicle_model_id
        )

        recalls_loaded, recalls_failed = load_recalls(
            model_year_id,
            recalls
        )

        complaints_loaded, complaints_failed = load_complaints(
            model_year_id,
            complaints
        )

        total_received = len(recalls) + len(complaints)

        total_loaded = (
            recalls_loaded
            + complaints_loaded
        )

        total_failed = (
            recalls_failed
            + complaints_failed
        )

        finish_ingestion_run(
            run_id,
            "SUCCESS",
            total_received,
            total_loaded,
            total_failed,
        )

        print("\nINGESTION COMPLETE")
        print("-------------------------")
        print(f"Received: {total_received}")
        print(f"Loaded:   {total_loaded}")
        print(f"Failed:   {total_failed}")

    except Exception as exc:
        finish_ingestion_run(
            run_id,
            "FAILED",
            0,
            0,
            0,
            str(exc),
        )

        raise


if __name__ == "__main__":
    main()