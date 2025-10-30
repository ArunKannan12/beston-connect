#!/usr/bin/env python
"""
fix_migrations.py
Safely fixes migration inconsistencies (Render / Neon friendly).
Only includes real migration files that exist in your project.
"""

import os
import django
from django.db import connection
from django.core.management import call_command
from django.db.migrations.loader import MigrationLoader

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()


def get_applied_migrations():
    """Return a set of applied migrations in the database."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT app, name FROM django_migrations")
        return {(row[0], row[1]) for row in cursor.fetchall()}


def fake_missing_migrations(app_label, correct_order=None):
    """
    Fake migrations that exist in code but are missing in DB.
    """
    loader = MigrationLoader(connection)
    applied = get_applied_migrations()

    if correct_order:
        migrations_in_code = correct_order
    else:
        # Default: any migration found in code for this app
        migrations_in_code = [key[1] for key in loader.graph.nodes if key[0] == app_label]

    for migration_name in migrations_in_code:
        if (app_label, migration_name) not in applied:
            print(f"🚨 Faking {app_label}.{migration_name}...")
            call_command("migrate", app_label, migration_name, fake=True)


if __name__ == "__main__":
    print("🚨 Starting migration fix...")

    # --- Products ---
    products_order = [
        "0001_initial",
        "0002_productvariant_weight",
        "0003_productvariant_promoter_commission_rate",
        "0004_delete_courierservice",
    ]
    fake_missing_migrations("products", products_order)

    # --- Promoter ---
    promoter_order = [
        "0001_initial",
        "0002_remove_promoter_deposit_amount_and_more",
        "0003_promoter_promoter_type_promoter_referred_by_and_more",
        "0004_commissionlevel_promoter_premium_activated_at",
        "0005_premiumsettings_promoterpayment_promotedproduct",
        "0006_alter_promoter_account_holder_name_and_more",
        "0007_alter_promoter_phone_number",
        "0008_remove_promoter_application_status_and_more",
        "0009_premiumsettings_offer_active_and_more",
        "0010_promotedproduct_click_count_and_more",
        "0011_withdrawalrequest_processed_at_and_more",
    ]
    fake_missing_migrations("promoter", promoter_order)

    # --- Orders ---
    fake_missing_migrations("orders")

    # --- Admin Dashboard ---
    admin_dashboard_order = ["0001_initial"]
    fake_missing_migrations("admin_dashboard", admin_dashboard_order)

    # --- Investor ---
    fake_missing_migrations("investor", ["0001_initial"])

    # --- Accounts ---
    accounts_order = [
        "0001_initial",
        "0002_role_alter_customuser_role_userrole",
        "0003_customuser_active_role",
        "0004_customuser_roles_list_alter_customuser_city_and_more",
        "0005_alter_customuser_city_alter_customuser_district_and_more",
    ]
    fake_missing_migrations("accounts", accounts_order)

    # --- Cart ---
    fake_missing_migrations("cart", ["0001_initial"])

    # --- Sessions ---
    fake_missing_migrations("sessions", ["0001_initial"])

    print("🚨 Applying remaining migrations normally...")
    call_command("migrate")

    print("✅ Migration fix completed successfully!")
