#!/usr/bin/env python
"""
fix_migrations.py
Automatically fixes migration inconsistencies on Render deployments.
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

    If `correct_order` is provided, apply fakes in that specific order.
    """
    loader = MigrationLoader(connection)
    graph = loader.graph
    applied = get_applied_migrations()

    if correct_order:
        migrations_in_code = correct_order
    else:
        # Default: any migration found in code for this app
        migrations_in_code = [key[1] for key in graph.nodes if key[0] == app_label]

    for migration_name in migrations_in_code:
        if (app_label, migration_name) not in applied:
            print(f"🚨 Faking {app_label}.{migration_name}...")
            call_command("migrate", app_label, migration_name, fake=True)


if __name__ == "__main__":
    print("🚨 Starting migration fix...")

    # --- Step 1: Products migrations in order ---
    products_order = [
        "0001_initial",
        "0002_category_image_alter_productimage_product",
        "0003_product_featured",
        "0004_productvariantimage",
        "0005_alter_productvariantimage_variant",
        "0006_product_products_pr_slug_3edc0c_idx_and_more",
        "0007_productimage_image_url_productvariantimage_image_url_and_more",
        "0008_alter_productimage_image_and_more",
        "0009_category_image_url",
        "0010_product_image_product_image_url_delete_productimage",
        "0011_remove_product_price_productvariant_base_price_and_more",
        "0012_remove_productvariant_additional_price",
        "0013_banner",
        "0014_productvariant_is_replacement_only_and_more",
        "0015_rename_is_replacement_only_productvariant_allow_replacement_and_more",
        "0016_productvariant_description",
        "0017_alter_category_options_and_more",
        "0018_alter_banner_options_banner_image_url_and_more",
    ]
    fake_missing_migrations("products", products_order)

    # --- Step 2: Promoter migrations ---
    promoter_order = ["0001_initial"]
    fake_missing_migrations("promoter", promoter_order)

    # --- Step 3: Orders migrations ---
    fake_missing_migrations("orders")

    # --- Step 4: Admin Dashboard migrations ---
    admin_order = ["0001_initial", "0002_alter_warehouselog_action"]
    fake_missing_migrations("admin_dashboard", admin_order)

    # --- Step 5: Apply remaining migrations normally ---
    print("🚨 Applying remaining migrations normally...")
    call_command("migrate")

    print("✅ Migration fix completed successfully!")
