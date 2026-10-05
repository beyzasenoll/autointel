from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator


default_args = {
    "owner": "autointel",
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
}


with DAG(
    dag_id="autointel_nhtsa_ingestion",
    description="Load NHTSA vehicle data into Supabase",
    start_date=datetime(2026, 10, 1),
    schedule="@daily",
    catchup=False,
    default_args=default_args,
    tags=["autointel", "nhtsa"],
) as dag:

    ingest_nhtsa = BashOperator(
        task_id="ingest_nhtsa_data",
        bash_command="python /opt/autointel/ingestion/load_nhtsa.py",
    )
