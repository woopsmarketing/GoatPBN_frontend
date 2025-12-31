"""
v1.0 - Export pbn_sites table from controlDB.db to CSV (2025-12-31)
Usage: python scripts/export_pbn_sites.py
"""

import csv
import sqlite3
from pathlib import Path


def export_pbn_sites(db_path: Path, output_path: Path) -> None:
    """pbn_sites 테이블을 CSV로 덤프합니다."""
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pbn_sites")
        rows = cursor.fetchall()
        headers = [description[0] for description in cursor.description]

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8", newline="") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            writer.writerows(rows)

        print(f"Exported {len(rows)} rows to {output_path}")
    finally:
        conn.close()


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[2]
    db_file = project_root / "controlDB.db"
    csv_file = project_root / "seed" / "data" / "pbn_sites_from_controlDB.csv"

    export_pbn_sites(db_file, csv_file)

