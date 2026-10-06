import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from supabase import create_client


VEHICLES = [
    {"make": "BMW", "model": "X1", "year": 2021},
    {"make": "BMW", "model": "X3", "year": 2021},
    {"make": "BMW", "model": "X5", "year": 2021},
    {"make": "BMW", "model": "3 SERIES", "year": 2021},
    {"make": "BMW", "model": "5 SERIES", "year": 2021},
    {"make": "BMW", "model": "X1", "year": 2022},
    {"make": "BMW", "model": "X3", "year": 2022},
    {"make": "BMW", "model": "X5", "year": 2022},
    {"make": "MINI", "model": "COOPER", "year": 2021},
    {"make": "MINI", "model": "COUNTRYMAN", "year": 2021},
]

RECALL_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle"
COMPLAINT_URL = "https://api.nhtsa.gov/complaints/complaintsByVehicle"
VPIC_URL = (
    "https://vpic.nhtsa.dot.gov/api/vehicles/"
    "GetModelsForMakeYear/make/{make}/modelyear/{year}"
)

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_SECRET_KEY")
)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase environment variables are missing.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def parse_date(value, fmt):
    if not value:
        return None
    try:
        return datetime.strptime(value, fmt).date().isoformat()
    except ValueError:
        return None


def normalize_model(value):
    return "".join(ch for ch in (value or "").upper() if ch.isalnum())


def get_valid_models(make, year):
    try:
        response = requests.get(
            VPIC_URL.format(make=make, year=year),
            params={"format": "json"},
            timeout=30,
        )
        response.raise_for_status()
        results = response.json().get("Results", [])
        return {
            normalize_model(item["Model_Name"]): item["Model_Name"].strip()
            for item in results
            if item.get("Model_Name")
        }
    except requests.exceptions.RequestException as exc:
        print(f"Model list warning: {year} {make}: {exc}")
        return {}


def fetch_nhtsa(url, make, model, year):
    try:
        response = requests.get(
            url,
            params={
                "make": make,
                "model": model,
                "modelYear": year,
            },
            timeout=30,
        )

        if response.status_code == 400:
            print(f"NHTSA rejected model: {year} {make} {model}")
            return []

        response.raise_for_status()
        return response.json().get("results", [])

    except requests.exceptions.Timeout:
        print(f"NHTSA timeout: {year} {make} {model}")
        return []

    except requests.exceptions.RequestException as exc:
        print(f"NHTSA request warning: {year} {make} {model}: {exc}")
        return []


def get_or_create_manufacturer(make):
    result = (
        supabase.table("manufacturers")
        .select("id")
        .eq("name", make)
        .execute()
    )
    if result.data:
        return result.data[0]["id"]

    result = (
        supabase.table("manufacturers")
        .insert({"name": make})
        .execute()
    )
    return result.data[0]["id"]


def get_or_create_vehicle_model(manufacturer_id, model):
    result = (
        supabase.table("vehicle_models")
        .select("id")
        .eq("manufacturer_id", manufacturer_id)
        .eq("model_name", model)
        .execute()
    )
    if result.data:
        return result.data[0]["id"]

    result = (
        supabase.table("vehicle_models")
        .insert({
            "manufacturer_id": manufacturer_id,
            "model_name": model,
        })
        .execute()
    )
    return result.data[0]["id"]


def get_or_create_model_year(vehicle_model_id, year):
    result = (
        supabase.table("model_years")
        .select("id")
        .eq("vehicle_model_id", vehicle_model_id)
        .eq("model_year", year)
        .execute()
    )
    if result.data:
        return result.data[0]["id"]

    result = (
        supabase.table("model_years")
        .insert({
            "vehicle_model_id": vehicle_model_id,
            "model_year": year,
        })
        .execute()
    )
    return result.data[0]["id"]


def load_recalls(model_year_id, recalls):
    loaded = 0
    failed = 0

    for item in recalls:
        try:
            campaign = item.get("NHTSACampaignNumber")
            if not campaign:
                failed += 1
                continue

            supabase.table("recalls").upsert(
                {
                    "model_year_id": model_year_id,
                    "campaign_number": campaign,
                    "component": item.get("Component"),
                    "summary": item.get("Summary"),
                    "consequence": item.get("Consequence"),
                    "remedy": item.get("Remedy"),
                    "report_received_date": parse_date(
                        item.get("ReportReceivedDate"),
                        "%d/%m/%Y",
                    ),
                    "raw_payload": item,
                },
                on_conflict="model_year_id,campaign_number",
            ).execute()

            loaded += 1

        except Exception as exc:
            failed += 1
            print(f"Recall failed {item.get('NHTSACampaignNumber')}: {exc}")

    return loaded, failed


def load_complaints(model_year_id, complaints):
    loaded = 0
    failed = 0

    for item in complaints:
        try:
            odi = item.get("odiNumber")
            if not odi:
                failed += 1
                continue

            supabase.table("complaints").upsert(
                {
                    "model_year_id": model_year_id,
                    "odi_number": str(odi),
                    "component": item.get("components"),
                    "complaint_date": parse_date(
                        item.get("dateComplaintFiled"),
                        "%m/%d/%Y",
                    ),
                    "incident_date": parse_date(
                        item.get("dateOfIncident"),
                        "%m/%d/%Y",
                    ),
                    "crash": item.get("crash", False),
                    "fire": item.get("fire", False),
                    "injuries": item.get("numberOfInjuries", 0),
                    "deaths": item.get("numberOfDeaths", 0),
                    "description": item.get("summary"),
                    "raw_payload": item,
                },
                on_conflict="odi_number",
            ).execute()

            loaded += 1

        except Exception as exc:
            failed += 1
            print(f"Complaint failed {item.get('odiNumber')}: {exc}")

    return loaded, failed


def start_run():
    result = (
        supabase.table("ingestion_runs")
        .insert({
            "source_name": "NHTSA",
            "entity_type": "vehicle_intelligence",
            "status": "RUNNING",
        })
        .execute()
    )
    return result.data[0]["id"]


def finish_run(run_id, status, received, loaded, failed, error=None):
    (
        supabase.table("ingestion_runs")
        .update({
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "rows_received": received,
            "rows_inserted": loaded,
            "rows_failed": failed,
            "error_message": error,
        })
        .eq("id", run_id)
        .execute()
    )


def main():
    run_id = start_run()
    total_received = 0
    total_loaded = 0
    total_failed = 0
    model_cache = {}

    try:
        print("\nAutoIntel AI")
        print("-------------------------")

        for vehicle in VEHICLES:
            make = vehicle["make"]
            requested_model = vehicle["model"]
            year = vehicle["year"]

            cache_key = (make.upper(), year)

            if cache_key not in model_cache:
                print(f"\nLoading valid models for {year} {make}...")
                model_cache[cache_key] = get_valid_models(make, year)

            valid_models = model_cache[cache_key]
            model = valid_models.get(
                normalize_model(requested_model),
                requested_model,
            )

            if model != requested_model:
                print(f"Resolved: {requested_model} -> {model}")

            print(f"\nVehicle: {year} {make} {model}")
            print("Fetching NHTSA data...")

            recalls = fetch_nhtsa(RECALL_URL, make, model, year)
            complaints = fetch_nhtsa(COMPLAINT_URL, make, model, year)

            print(f"Recalls: {len(recalls)}")
            print(f"Complaints: {len(complaints)}")

            if not recalls and not complaints:
                print("No data. Skipping vehicle.")
                continue

            manufacturer_id = get_or_create_manufacturer(make)
            vehicle_model_id = get_or_create_vehicle_model(
                manufacturer_id,
                model,
            )
            model_year_id = get_or_create_model_year(
                vehicle_model_id,
                year,
            )

            total_received += len(recalls) + len(complaints)

            recall_loaded, recall_failed = load_recalls(
                model_year_id,
                recalls,
            )
            complaint_loaded, complaint_failed = load_complaints(
                model_year_id,
                complaints,
            )

            total_loaded += recall_loaded + complaint_loaded
            total_failed += recall_failed + complaint_failed

        finish_run(
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
        finish_run(
            run_id,
            "FAILED",
            total_received,
            total_loaded,
            total_failed,
            str(exc),
        )
        raise


if __name__ == "__main__":
    main()
