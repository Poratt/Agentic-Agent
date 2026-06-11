# Explorer Source Reference

Status: Closed on 2026-06-11. This is not an active implementation plan. It is retained as a Jane source-data and DOM reference for the completed Explorer feature work.

object example :

Current UI note:

- The genetics column shows origin strain and parent strains as independent filter buttons.
- The connector line between origin strain and parent strains was intentionally removed from the current Explorer UI.

````json
{
"id": "garlix",
"created_at": "2025-09-09T14:02:49+0000",
"updated_at": "2025-10-29T11:39:56+0000",
"store_id": 18332,
"product_id": "garlix",
"batch_id": 4324,
"in_stock": true,
"store_price": 129.0,
"store_product_date": "2026-07-31",
"sku_code": "7290020252944",
"protect_store_price": false,
"protect_store_quantity": false,
"tier_ordering": 12,
"is_discount_exists": false,
"is_pinned": false,
"by_categorys": 0,
"product_type": "flower",
"family": "indica",
"heb_name": "\u05d2\u05e8.\u05dc\u05d9\u05e7\u05e1",
"from_price": 110.0,
"origin_country": "IL",
"marketer__heb_name": "\u05d8\u05d5\u05d2\u05d3\u05e8",
"manufacturer__heb_name": "\u05e7\u05e0\u05d0\u05d3\u05d5",
"manufacturer_series__heb_name": "\u05e7\u05e0\u05d0\u05d3\u05d5",
"product_note": "",
"eng_name": "Gar.Lix",
"description": "",
"marketer_id": "together-pharma",
"manufacturer_id": "cannado",
"manufacturer_series_id": "cannado",
"strain_id": "glazed-garlic",
"category": "T22/C4",
"catalog_price": 349.0,
"grow_type": "indoor",
"main_img_url": "https://cdn.jane.co.il/products/e5cc6698-048c-4436-ad62-1c1523e48bba.jpg",
"main_img_300_url": "https://cdn.jane.co.il/products-grid/df072fb5-3569-47e8-b3d3-8efeb7f529f8_resized.jpeg",
"main_img_200_url": "https://cdn.jane.co.il/products-grid/2f2e29f6-cfb0-4605-a8fb-60f2bae175a3_resized.jpeg",
"main_img_thumbnail_url": "https://cdn.jane.co.il/products/9c083a00-5c9d-4cb0-87aa-150cb1707061_resized.jpeg",
"biz_url": "https://cannabiz.co.il/product/%d7%92%d7%a8-%d7%9c%d7%99%d7%a7%d7%a1-gar-lix-%d7%90%d7%99%d7%a0%d7%93%d7%99%d7%a7%d7%94-t22-c4/",
"image_size": "92.32",
"is_active": true,
"store_add_datetime": "2025-10-27T08:49:23+0000",
"search_heb_names": [
    "\u05d2\u05e8\u05dc\u05d9\u05e7\u05e1",
    "\u05d2\u05d0\u05e8.\u05dc\u05d9\u05e7\u05e1",
    "\u05d2\u05d0\u05e8\u05dc\u05d9\u05e7\u05e1"
],
"search_eng_names": [
    "garlix"
],
"packaging_options": [
    "bag"
],
"views_count_in_last_hour": 0,
"popularity_rank": 0,
"random_sort_order": 759967,
"completeness_score": 79,
"product_status": "in_stock",
"product": {
    "created_at": "2025-09-09T14:02:49+0000",
    "updated_at": "2025-10-29T11:39:56+0000",
    "id": "garlix",
    "heb_name": "\u05d2\u05e8.\u05dc\u05d9\u05e7\u05e1",
    "eng_name": "Gar.Lix",
    "description": "",
    "marketer_id": "together-pharma",
    "manufacturer_id": "cannado",
    "manufacturer_series_id": "cannado",
    "strain_id": "glazed-garlic",
    "product_type": "flower",
    "category": "T22/C4",
    "family": "indica",
    "catalog_price": 349.0,
    "grow_type": "indoor",
    "sku_code": "7290020252999",
    "origin_country": "IL",
    "main_img_url": "https://cdn.jane.co.il/products/e5cc6698-048c-4436-ad62-1c1523e48bba.jpg",
    "main_img_300_url": "https://cdn.jane.co.il/products-grid/df072fb5-3569-47e8-b3d3-8efeb7f529f8_resized.jpeg",
    "main_img_200_url": "https://cdn.jane.co.il/products-grid/2f2e29f6-cfb0-4605-a8fb-60f2bae175a3_resized.jpeg",
    "main_img_thumbnail_url": "https://cdn.jane.co.il/products/9c083a00-5c9d-4cb0-87aa-150cb1707061_resized.jpeg",
    "biz_url": "https://cannabiz.co.il/product/%d7%92%d7%a8-%d7%9c%d7%99%d7%a7%d7%a1-gar-lix-%d7%90%d7%99%d7%a0%d7%93%d7%99%d7%a7%d7%94-t22-c4/",
    "image_size": "92.32",
    "is_active": true,
    "store_add_datetime": "2025-10-27T08:49:23+0000",
    "search_heb_names": [
        "\u05d2\u05e8\u05dc\u05d9\u05e7\u05e1",
        "\u05d2\u05d0\u05e8.\u05dc\u05d9\u05e7\u05e1",
        "\u05d2\u05d0\u05e8\u05dc\u05d9\u05e7\u05e1"
    ],
    "search_eng_names": [
        "garlix"
    ],
    "packaging_options": [
        "bag"
    ],
    "views_count_in_last_hour": 0,
    "popularity_rank": 0,
    "random_sort_order": 759967,
    "completeness_score": 79,
    "product_status": "in_stock",
    "manufacturer_series_heb_name": "\u05e7\u05e0\u05d0\u05d3\u05d5",
    "series_heb_name": null,
    "packaging_images": {
        "bag": "https://cdn.jane.co.il/products/e5cc6698-048c-4436-ad62-1c1523e48bba.jpg"
    },
    "parent_strains_heb_name": [
        "\u05d2\u05e8\u05dc\u05d9\u05e7 \u05d1\u05e8\u05ea' 2.0"
    ],
    "parents_second_strains_heb_name": [
        "\u05d3\u05d9\u05d6\u05d9\u05d9\u05e0\u05e8 \u05e8\u05d0\u05e0\u05d8\u05d6"
    ]
},
"grow_type_name": "\u05d0\u05d9\u05e0\u05d3\u05d5\u05e8 (\u05e0\u05d5\u05e8\u05d5\u05ea)",
"strain_heb_name": "\u05d2\u05dc\u05d9\u05d9\u05d6\u05d3 \u05d2\u05e8\u05dc\u05d9\u05e7",
"series_heb_name": null,
"series_biz_url": null,
"manufacturer_series_heb_name": "\u05e7\u05e0\u05d0\u05d3\u05d5",
"manufacturer_series_biz_url": "https://cannabiz.co.il/brand/%d7%a7%d7%a0%d7%90%d7%93%d7%95-cannado/",
"marketer_heb_name": "\u05d8\u05d5\u05d2\u05d3\u05e8",
"marketer_eng_name": "Together",
"manufacturer_heb_name": "\u05e7\u05e0\u05d0\u05d3\u05d5",
"manufacturer_eng_name": "Cannado",
"marketer_logo_url": "https://cdn.jane.co.il/marketers/38e30122-958f-4617-b5bc-50f435813ef2.jpg",
"marketer_cover_img_url": "https://cdn.jane.co.il/marketers/adcf0c3c-ff4a-4469-b400-67d6dc21e61d.jpg",
"store_product_note": null,
"store_product_id": 129021148,
"store": {
    "id": "18332",
    "city_id": 242,
    "street_name": "\u05e2\u05e4\u05e8\u05d4 \u05d7\u05d6\u05d4 ",
    "street_num": 9,
    "display_name": "\u05ea\u05dc\u05ea\u05df",
    "display_name_eng": "tiltan",
    "social_display_name_eng": "Tiltan Pharmacy",
    "has_delivery": true,
    "opening_hours": {
        "1": [
            [
                9,
                22
            ]
        ],
        "2": [
            [
                9,
                22
            ]
        ],
        "3": [
            [
                9,
                22
            ]
        ],
        "4": [
            [
                9,
                22
            ]
        ],
        "5": [
            [
                9,
                22
            ]
        ],
        "6": [
            [
                9,
                16
            ]
        ],
        "7": [
            [
                11,
                22
            ]
        ]
    },
    "email": "info@tiltan-pharmacy.com",
    "email_2nd": "",
    "phone_number": "052-3824738",
    "phone_number_2nd": "03-7555465",
    "logo_url": "https://cdn.jane.co.il/store-logos/cd3b858e-b2a7-4114-a36a-c96e07dcf199_resized.png",
    "logo_thumbnail_url": "https://cdn.jane.co.il/store-logos/444085f8-dc02-4ae7-8a71-bf23b96658d2_resized.png",
    "cover_img_url": "https://cdn.jane.co.il/store-covers/1c8e5a19-6331-4e01-966f-b48e59cd8191.jpeg",
    "custom_message": "\u05d1\u05ea \u05d9\u05dd",
    "stock_updated_at": "2026-06-09T15:32:46+0000",
    "biz_url": "https://cannabiz.co.il/listing/%D7%91%D7%99%D7%AA-%D7%9E%D7%A8%D7%A7%D7%97%D7%AA-%D7%AA%D7%9C%D7%AA%D7%9F/",
    "enable_orders": true,
    "show_customer_service_hours": false,
    "customer_service_from_hour": "09:00",
    "customer_service_to_hour": "18:00",
    "shop_menu_style": "list",
    "shop_menu_style_tablet": "list",
    "is_active": true,
    "latitude": 32.0071996,
    "longitude": 34.740126,
    "show_low_stock_quantity": false,
    "low_stock_product_quantity": 2,
    "supported_health_funds": [
        "mehudet",
        "clalit",
        "maccabi",
        "leumit"
    ],
    "is_on_trial": false,
    "legal_name": " \u05e7\u05e0\u05d0\u05d1\u05d9\u05e1\u05e8\u05d9 \u05d1\u05e2''\u05de",
    "responsible_pharmacist_name": "",
    "not_viewed_notifications_count": 0,
    "subscribed_to_notification_types": [
        "jane_notification",
        "post_new_comment",
        "discount_expired",
        "new_order",
        "user_cancelled_order",
        "document_sharing",
        "product_expiring",
        "post_approved",
        "bot_message_sent",
        "bot_message_failed",
        "chain_store_import_completed"
    ],
    "views_count_in_last_hour": 19,
    "tier_ordering": 9,
    "is_discount_exists": true,
    "has_parking": true,
    "is_accessible": true,
    "access_list_verified_at": "2026-04-28T18:03:44+0000",
    "is_currently_open": false,
    "city": {
        "created_at": "2022-06-07T10:55:47+0000",
        "updated_at": "2022-06-07T10:55:47+0000",
        "id": "242",
        "slug_id": "bat-yam",
        "heb_name": "\u05d1\u05ea \u05d9\u05dd",
        "eng_name": "Bat Yam",
        "biz_url": "https://cannabiz.co.il/%D7%90%D7%96%D7%95%D7%A8%20listing/%D7%91%D7%AA-%D7%99%D7%9D/",
        "district": "\u05ea\u05dc \u05d0\u05d1\u05d9\u05d1",
        "latitude": "32.015144",
        "longitude": "34.752885"
    }
},
"marketer_biz_url": "https://cannabiz.co.il/listing/%D7%98%D7%95%D7%92%D7%93%D7%A8-%D7%A4%D7%90%D7%A8%D7%9E%D7%94/",
"manufacturer_biz_url": "https://cannabiz.co.il/listing/%D7%A7%D7%A0%D7%90%D7%93%D7%95-cannado/",
"strain_biz_url": "https://cannabiz.co.il/product-tag/%d7%92%d7%9c%d7%99%d7%99%d7%96%d7%93-%d7%92%d7%a8%d7%9c%d7%99%d7%a7-glazed-garlic/",
"batch": {
    "id": "4324",
    "created_at": "2025-10-27T11:54:35+0000",
    "updated_at": "2025-10-27T11:54:35+0000",
    "product_id": "garlix",
    "batch_id": "10GAR22T2501",
    "expiration_date": "2026-07-31",
    "percent_cbn": 0.0,
    "percent_cbg": 0.0,
    "is_active": true,
    "is_deleted": false,
    "percent_thc": "",
    "percent_cbd": "",
    "product_heb_name": "\u05d2\u05e8.\u05dc\u05d9\u05e7\u05e1",
    "product_eng_name": "Gar.Lix",
    "packaging_options": [],
    "symbols": [],
    "symbol_ids": []
},
"packaging_images": {
    "bag": "https://cdn.jane.co.il/products/e5cc6698-048c-4436-ad62-1c1523e48bba.jpg"
},
"symbols": [
    {
        "id": "pest-free",
        "description": "\u05d1\u05e2\u05ea \u05d2\u05d9\u05d3\u05d5\u05dc \u05d4\u05e7\u05e0\u05d0\u05d1\u05d9\u05e1 \u05dc\u05d0 \u05d1\u05d5\u05e6\u05e2 \u05db\u05dc \u05e9\u05d9\u05de\u05d5\u05e9 \u05d1\u05d7\u05d5\u05de\u05e8\u05d9 \u05d4\u05d3\u05d1\u05e8\u05d4",
        "img_url": "https://cdn.jane.co.il/symbols/pest-free.png"
    },
    {
        "id": "beta-radiation",
        "description": "\u05d4\u05e7\u05e0\u05d0\u05d1\u05d9\u05e1 \u05e2\u05d1\u05e8 \u05d4\u05dc\u05d9\u05da \u05d4\u05d5\u05e8\u05d3\u05ea \u05e2\u05d5\u05de\u05e1 \u05de\u05d9\u05e7\u05e8\u05d5\u05d1\u05d9\u05d0\u05dc\u05d9 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea \"\u05e4\u05e1\u05d8\u05d5\u05e8 \u05e7\u05e8\" (\u05d4\u05e7\u05e8\u05e0\u05d4 \u05d1\u05e7\u05e8\u05d9\u05e0\u05ea \u05d1\u05d8\u05d0)",
        "img_url": "https://cdn.jane.co.il/symbols/Beta-Radiation.png"
    }
],
"images": [],
"terpenes": [],
"parents": [
    {
        "created_at": "2025-09-21T11:07:08+0000",
        "updated_at": "2025-09-21T11:07:08+0000",
        "id": "garlic-breath-20",
        "heb_name": "\u05d2\u05e8\u05dc\u05d9\u05e7 \u05d1\u05e8\u05ea' 2.0",
        "eng_name": "Garlic Breath 2.0",
        "description": " ",
        "is_deleted": false,
        "biz_url": "https://cannabiz.co.il/product-tag/%d7%92%d7%a8%d7%9c%d7%99%d7%a7-%d7%91%d7%a8%d7%aa-2-0-garlic-breath-2-0/"
    }
],
"parents_second": [
    {
        "created_at": "2025-09-21T11:12:17+0000",
        "updated_at": "2025-09-21T11:12:17+0000",
        "id": "designer-runtz",
        "heb_name": "\u05d3\u05d9\u05d6\u05d9\u05d9\u05e0\u05e8 \u05e8\u05d0\u05e0\u05d8\u05d6",
        "eng_name": "Designer Runtz",
        "description": " ",
        "is_deleted": false,
        "biz_url": "https://cannabiz.co.il/product-tag/%d7%93%d7%99%d7%96%d7%99%d7%99%d7%a0%d7%a8-%d7%a8%d7%90%d7%a0%d7%98%d7%96-designer-runtz/"
    }
],
"parent_strains_heb_name": [
    "\u05d2\u05e8\u05dc\u05d9\u05e7 \u05d1\u05e8\u05ea' 2.0"
],
"parents_second_strains_heb_name": [
    "\u05d3\u05d9\u05d6\u05d9\u05d9\u05e0\u05e8 \u05e8\u05d0\u05e0\u05d8\u05d6"
],
"reviews": {
    "biz_reviews_count": 1,
    "jane_reviews_count": 0,
    "biz_reviews_avg": 3.0,
    "jane_reviews_avg": 0.0,
    "total_reviews_count": 1,
    "total_reviews_avg": 3.0,
    "reviews_sort_score": 0.54
}
},

```


[x] isNew - האם מופיע “חדש!”
[] rating - דירוג, כרגע בדוגמה (0)
[x] deal - מבצע, למשל 3 ב-₪279
[] productType - למשל תפרחת
[] category - למשל T22 C4
[] family - למשל אינדיקה
[] marketer - משווק
[x] manufacturer - מגדל
[] series - סדרה
[x] brand - מותג
[x] expiry - תוקף, למשל 12/26
[] batch - אצווה, למשל 260035
[x] price / fromPrice - מחיר נוכחי
[x] catalogPrice - מחיר מחוק
[] imageUrl - תמונת מוצר
[] productUrl - קישור לעמוד מוצר
[] countryCode - אם מזהים מה־flag ca.svg

מהשורה המתרחבת:
[x] thc - למשל 24.2%-19.9%
[x] cbd - למשל 4%-0%
[] growType - למשל אינדור (נורות)
[x] terpenes - למשל
[x] packageType - למשל שקית
[] promotionText - טקסט מבצע מורחב
[] promotionLimit - למשל עד גמר המלאי
[] bestDealText - למשל “המבצע המשתלם ביותר יוכל בסל”




Row structure

```html
<table
role="table"
class="min-w-full divide-y divide-transparent bg-gray-50 text-gray-400 border"
>
<thead class="select-none whitespace-nowrap sticky -top-0.5 z-[12]">
<tr role="row">
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]"
>
<div class="p-1">שם</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div>אפיון</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div class="mt-0.5">משווק</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div class="mt-0.5">מגדל</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div class="mt-0.5">סדרה</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div class="mt-0.5">מותג</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div class="mt-0.5">ארץ ייצור</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]"
>
<div class="mt-0.5">תוקף</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]"
>
<div class="mt-0.5">אצווה</div>
<div class="mt-0.5">
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path></svg
><svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-2 sm:mr-1 text-jane-900"
>
<path
fill-rule="evenodd"
d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</div>
</th>
<th
colspan="1"
role="columnheader"
title="Toggle SortBy"
scope="col"
class="font-normal z-10 relative bg-gray-50 underline text-black"
style="cursor: pointer;"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]  mb-0.5 xs:flex justify-center md:items-center "
>
<div class="mt-0.5">מחיר</div>
<svg
xmlns="http://www.w3.org/2000/svg"
viewBox="0 0 20 20"
fill="currentColor"
aria-hidden="true"
class="w-3 h-3 text-jane-500"
>
<path
fill-rule="evenodd"
d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
clip-rule="evenodd"
></path>
</svg>
</div>
</th>
<th
colspan="1"
role="columnheader"
scope="col"
class="font-normal z-10 relative bg-gray-50 text-black"
>
<div
class="flex items-center text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]"
>
&nbsp;
</div>
</th>
<th class="bg-gray-50"><div class="bg-gray-50 w-full"></div></th>
</tr>
</thead>
<tbody role="rowgroup" class="divide-y-0 divide-transparent bg-white">
<tr
role="row"
class="group text-gray-800 transition-colors hover:bg-gray-100 cursor-pointer bg-white border-b-[1px]"
>
<td role="cell" width="0" class="p-0 m-0  border-b-[1px]">
<span></span>
<div class="flex py-1 relative overflow-hidden">
<div class="flex flex-col justify-start pl-1">
<div class="flex gap-1">
<div
class="bg-green-800 flex justify-center items-center text-center absolute z-10 origin-top-right rotate-45 font-medium text-white bg-opacity-70 w-[45px] h-[10px] text-[8px] top-[21px] -right-[10px] "
>
חדש!
</div>
<span class="relative">
<div class="xs:w-[50px] xs:h-[50px] w-[70px] h-[70px] max-w-none">
    <span
    style="box-sizing: border-box; display: block; overflow: hidden; width: initial; height: initial; background: none; opacity: 1; border: 0px; margin: 0px; padding: 0px; position: relative;"
    >
    <span
        style="box-sizing: border-box; display: block; width: initial; height: initial; background: none; opacity: 1; border: 0px; margin: 0px; padding: 100% 0px 0px;"
    ></span>
    <img
        alt="אריזת המוצר ראיין- Rhine"
        sizes="100vw"
        srcset="
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg  640w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg  750w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg  828w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg 1080w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg 1200w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg 1920w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg 2048w,
        https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg 3840w
        "
        src="https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg"
        decoding="async"
        data-nimg="responsive"
        style="position: absolute; inset: 0px; box-sizing: border-box; padding: 0px; border-width: medium; border-style: none; border-color: currentcolor; border-image: initial; margin: auto; display: block; width: 0px; height: 0px; min-width: 100%; max-width: 100%; min-height: 100%; max-height: 100%; object-fit: contain;"
    />
    </span>
</div>
</span>
<div class="flex flex-col justify-around">
<div
    class="text-base sm:text-sm text-gray-900 font-medium w-[120px] leading-4"
>
    ראיין
</div>
<span
    dir="ltr"
    class="text-base text-right sm:text-sm text-gray-500 font-medium w-[120px]"
>
    Rhine
</span>
<div class="flex items-center">
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    class="w-3.5 h-3.5 text-gray-300"
    >
    <path
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
    ></path>
    </svg>
    <span class="text-sm text-gray-600 leading-none">(0)</span>
</div>
<div class="flex flex-col mb-1">
    <span class="flex whitespace-nowrap">
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        aria-hidden="true"
        class="w-3.5 text-red-500 cursor-pointer hover:text-pink-600"
    >
        <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
        ></path>
    </svg>
    <span class="text-xs font-semibold leading-none text-red-500">
        3 ב-₪279
    </span>
    </span>
</div>
</div>
</div>
<div></div>
</div>
</div>
</td>
<td role="cell" width="0" class="p-0 m-0  border-b-[1px]">
<div class="flex justify-center gap-0.5">
<button
class="h-[16px] sm:h-[20px] border-2 flex items-center text-center  text-white rounded-sm px-1"
style="border: 0px solid rgb(223, 248, 214); background-color: rgb(191, 240, 173); color: rgb(76, 100, 68); width: 50px;"
>
<div class="flex items-center flex-col m-auto whitespace-pre">
<p class="text-xs sm:text-sm font-semibold leading-[8px] sm:leading-[9px]">
תפרחת
</p>
</div>
</button>
<button
class="h-[16px] sm:h-[20px] border-2 flex items-center text-center  text-white rounded-sm px-1"
style="border: 0px solid rgb(186, 93, 93); background-color: rgb(156, 24, 24); color: rgb(255, 255, 255); width: 52px;"
>
<div class="flex items-center flex-col m-auto whitespace-pre">
<p class="text-xs sm:text-sm font-semibold leading-[8px] sm:leading-[9px]">
T22 C4
</p>
</div>
</button>
<button
class="h-[16px] sm:h-[20px] border-2 flex items-center text-center  text-white rounded-sm px-1"
style="border: 0px solid rgb(127, 153, 172); background-color: rgb(0, 52, 89); color: rgb(255, 255, 255); width: 50px;"
>
<div class="flex items-center flex-col m-auto whitespace-pre">
<p class="text-xs sm:text-sm font-semibold leading-[8px] sm:leading-[9px]">
אינדיקה
</p>
</div>
</button>
</div>
</td>
<td role="cell" width="200" class="p-0 m-0  border-b-[1px]">
<div
class="text-[#1E293B] text-center text-xs sm:text-[14px] font-semibold leading-[13px] xs:leading-[13px] sm:leading-[16px] break-words"
>
קנטק
</div>
</td>
<td role="cell" width="300" class="p-0 m-0  border-b-[1px]">
<div
class="text-[#1E293B] text-center text-xs sm:text-[14px] font-semibold leading-[13px] xs:leading-[13px] sm:leading-[16px] break-words"
>
קנאפארמה
</div>
</td>
<td role="cell" width="200" class="p-0 m-0  border-b-[1px]"></td>
<td role="cell" width="0" class="p-0 m-0  border-b-[1px]">
<div
class="text-jane-800 text-center text-sm font-semibold leading-[12px] xs:leading-[12px] sm:leading-[16px] xs:ml-4 break-words"
>
לומה
</div>
</td>
<td role="cell" width="200" class="p-0 m-0  border-b-[1px]">
<div
class="flex items-center justify-center text-jane-800 m-auto text-center text-sm font-semibold"
>
<span class="block">קנדה</span>
<div
class=""
data-tooltipped=""
aria-describedby="tippy-tooltip-1391"
data-original-title="🇨🇦"
style="display: inline;"
>
<img
class="w-4 h-4 mx-1"
alt="ארץ ייצור"
title="ארץ ייצור"
src="https://cdn.jane.co.il/flags/ca.svg"
/>
</div>
</div>
</td>
<td role="cell" width="0" class="p-0 m-0  border-b-[1px]">
<div
class="text-center text-jane-800 text-sm font-semibold leading-[12px] sm:leading-[16px]"
>
12/26
</div>
</td>
<td role="cell" width="20" class="p-0 m-0  border-b-[1px]">
<div
class="text-center text-jane-800 text-sm font-semibold leading-[12px] sm:leading-[16px]"
>
260035
</div>
</td>
<td role="cell" width="200" class="p-0 m-0  border-b-[1px]">
<div class="text-jane-800 font-semibold sm:text-sm break-words pl-[1px]">
<div class="text-center pr-1" dir="ltr">
<span>
<span class="text-green-600 leading-none block font-semibold">₪99</span>
<span class=" block text-sm line-through">₪199</span>
</span>
</div>
</div>
</td>
<td role="cell" width="100" class="p-0 m-0  border-b-[1px]">
<div class="relative flex items-center justify-center ml-[1px]">
<div class="relative">
<span></span>
<button
type="button"
class="inline-flex justify-center transition-colors items-center px-2 py-1 sm:px-2.5 sm:py-1.5 border rounded-md shadow-sm text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jane-500 text-white bg-jane-600 hover:bg-jane-700 border-transparent  false"
>
<svg
stroke="currentColor"
fill="currentColor"
stroke-width="0"
viewBox="0 0 16 16"
class="w-4 h-4 cursor-pointer"
height="1em"
width="1em"
xmlns="http://www.w3.org/2000/svg"
>
<path
    d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0m7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M9 5.5V7h1.5a.5.5 0 0 1 0 1H9v1.5a.5.5 0 0 1-1 0V8H6.5a.5.5 0 0 1 0-1H8V5.5a.5.5 0 0 1 1 0"
></path>
</svg>
</button>
</div>
</div>
</td>
<td role="cell" class="p-0 m-0 border-b-[1px]"><div class=""></div></td>
</tr>
</tbody>
</table>
````

Expanded row details structure :

```html
<div class="shadow-inner text-black border-b-2 px-2 py-2.5 bg-white border-gray-100">
  <div class="p-2">
    <div class="flex flex-col mt-4 gap-2">
      <div class="flex gap-2 w-full">
        <a
          href="/products/rhine"
          target="_blank"
          rel="noopener noreferrer"
          class="cursor-pointer underline"
        >
          <img
            src="https://d3j1qu09670qsz.cloudfront.net/products/7d55d70d-5ae7-4ce0-824f-a17e1cb4a427.jpg"
            class="w-[80px] h-[80px] sm:w-[165px] sm:h-[165px]"
            alt="אריזת המוצר ראיין- Rhine"
          />
        </a>
        <div class="flex items-start flex-col gap-2">
          <a
            href="/products/rhine"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer false"
          >
            <div
              class="flex flex-col font-bold items-start text-jane-800 md:flex-row md:items-center md:gap-1"
            >
              <span class=" text-xl">ראיין</span>
              <span>(Rhine)</span>
            </div>
          </a>
          <div class="flex gap-1">
            <button
              class="h-[16px] sm:h-[20px] border-2 flex items-center text-center  text-white rounded-sm px-1"
              style="border: 0px solid rgb(223, 248, 214); background-color: rgb(191, 240, 173); color: rgb(76, 100, 68); width: 50px;"
            >
              <div class="flex items-center flex-col m-auto whitespace-pre">
                <p
                  class="text-xs sm:text-sm font-semibold leading-[8px] sm:leading-[9px]"
                >
                  תפרחת
                </p>
              </div>
            </button>
            <button
              class="h-[16px] sm:h-[20px] border-2 flex items-center text-center  text-white rounded-sm px-1"
              style="border: 0px solid rgb(186, 93, 93); background-color: rgb(156, 24, 24); color: rgb(255, 255, 255); width: 52px;"
            >
              <div class="flex items-center flex-col m-auto whitespace-pre">
                <p
                  class="text-xs sm:text-sm font-semibold leading-[8px] sm:leading-[9px]"
                >
                  T22 C4
                </p>
              </div>
            </button>
            <button
              class="h-[16px] sm:h-[20px] border-2 flex items-center text-center  text-white rounded-sm px-1"
              style="border: 0px solid rgb(127, 153, 172); background-color: rgb(0, 52, 89); color: rgb(255, 255, 255); width: 50px;"
            >
              <div class="flex items-center flex-col m-auto whitespace-pre">
                <p
                  class="text-xs sm:text-sm font-semibold leading-[8px] sm:leading-[9px]"
                >
                  אינדיקה
                </p>
              </div>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1 w-fit">
            <div class="flex gap-1">
              <span class="text-jane-500">THC</span>
              <span class="font-semibold">24.2%-19.9%</span>
            </div>
            <div class="flex gap-1">
              <span class="text-jane-500">CBD</span>
              <span class="font-semibold">4%-0%</span>
            </div>
            <div class="flex gap-1">
              <span class="text-jane-500">אצווה</span>
              <span class="font-semibold">260035</span>
            </div>
            <div class="flex gap-1">
              <span class="text-jane-500">תוקף</span>
              <span class="font-semibold">12/26</span>
            </div>
            <div class="flex gap-1 col-span-full">
              <span class="text-jane-500">מחיר</span>
              <span class="font-semibold">
                <div class="gap-1.5 flex items-center">
                  <span class="text-green-600">₪99</span>
                  <span class="line-through font-semibold text-sm leading-6">₪199</span>
                </div>
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="relative flex gap-1 mt-2 flex-col xs:flex-row w-full">
              <button
                type="button"
                class="inline-flex justify-center transition-colors items-center px-2 py-1 sm:px-2.5 sm:py-1.5 border rounded-md shadow-sm text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jane-500 text-white bg-jane-600 hover:bg-jane-700 border-transparent flex justify-center gap-1 w-[105px]"
              >
                <span class="text-sm">הוסף לסל</span>
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  stroke-width="0"
                  viewBox="0 0 16 16"
                  class="w-4 h-4"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0m7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M9 5.5V7h1.5a.5.5 0 0 1 0 1H9v1.5a.5.5 0 0 1-1 0V8H6.5a.5.5 0 0 1 0-1H8V5.5a.5.5 0 0 1 1 0"
                  ></path>
                </svg>
              </button>
              <button
                type="button"
                class="inline-flex justify-center transition-colors items-center px-2 py-1 sm:px-2.5 sm:py-1.5 border rounded-md shadow-sm text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jane-500 text-gray-800 bg-white hover:bg-gray-50 border-gray-300 w-[105px] flex justify-center text-sm min-h-[34px]"
              >
                <span class="text-sm">לעמוד מוצר</span>
                <span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    class="w-3.5 h-3.5"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        class="w-full max-w-md me-auto border-2 border-dashed border-blue-200 bg-white rounded-lg px-4 py-3 mt-3 shadow-sm"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                aria-hidden="true"
                class="w-6 h-6 text-red-600 flex-shrink-0"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                ></path>
              </svg>
              <div class="font-bold text-red-600 text-base">משתתף במבצע</div>
            </div>
            <span
              class="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border border-blue-100"
            >
              *עד גמר המלאי
            </span>
          </div>
          <div class="text-sm w-full">
            <ol class="list-disc text-gray-500">
              <div class="flex flex-col items-start mb-2">
                <button
                  class="py-4 flex justify-between w-full items-center px-4 transition-all duration-300 cursor-pointer rounded-lg  bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm "
                  id="headlessui-disclosure-button-:r1l:"
                  type="button"
                  aria-expanded="false"
                  data-headlessui-state=""
                >
                  <div class="flex flex-col">
                    <span class="text-right font-semibold text-gray-800 text-base">
                      3 ב-₪279
                    </span>
                    <span>(המבצע המשתלם ביותר יוחל בסל)</span>
                  </div>
                  <span class="flex-shrink-0 ml-2 bg-white rounded-full p-1 shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      aria-hidden="true"
                      class="w-5 h-5 text-blue-600 transition-all duration-300 transform rotate-0"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </span>
                </button>
              </div>
            </ol>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1">
        <span class="font-semibold">מגדל</span>
        <span>
          <a
            href="/manufacturer/cannapharmarx"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer underline"
          >
            קנאפארמה
          </a>
        </span>
        <span class="font-semibold">משווק</span>
        <span>
          <a
            href="/marketer/cantek"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer underline"
          >
            קנטק
          </a>
        </span>
        <span class="font-semibold">מותג</span>
        <span>
          <a
            href="/products/?filters=manufacturer_series_id^in^luma"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer underline"
          >
            לומה
          </a>
        </span>
        <span class="font-semibold">ארץ ייצור</span>
        <span>
          <a
            href="/products/?filters=origin_country^in^CA"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer underline"
          >
            קנדה
          </a>
        </span>
        <span class="font-semibold">זן מקור</span>
        <span>
          <a
            href="/strain/og-cheese"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer underline"
          >
            אוג'י צ'יז
          </a>
        </span>
        <span class="font-semibold">הורה #1</span>
        <span>
          <div class="flex gap-2 flex-wrap items-center">
            <a
              class=" underline items-center whitespace-nowrap"
              target="_blank"
              href="/strain/skunk-1/"
            >
              סקאנק #1
            </a>
            <div
              class=""
              data-tooltipped=""
              aria-describedby="tippy-tooltip-1417"
              style="display: inline;"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                stroke-width="0"
                viewBox="0 0 16 16"
                class="w-4 h-4 text-jane-600 cursor-pointer"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"
                ></path>
              </svg>
            </div>
          </div>
        </span>
        <span class="font-semibold">הורה #2</span>
        <span>
          <div class="flex gap-2 flex-wrap items-center">
            <a
              class=" underline items-center whitespace-nowrap"
              target="_blank"
              href="/strain/afghani/"
            >
              אפגני
            </a>
            <div
              class=""
              data-tooltipped=""
              aria-describedby="tippy-tooltip-1416"
              style="display: inline;"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                stroke-width="0"
                viewBox="0 0 16 16"
                class="w-4 h-4 text-jane-600 cursor-pointer"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2"
                ></path>
              </svg>
            </div>
          </div>
        </span>
        <span class="font-semibold">מתקן גידול</span>
        <span>
          <a
            href="/products/?filters=grow_type^in^indoor"
            target="_blank"
            rel="noopener noreferrer"
            class="cursor-pointer underline"
          >
            אינדור (נורות)
          </a>
        </span>
        <span class="font-semibold">טרפנים</span>
        <span></span>
        <span class="font-semibold">סוג אריזה</span>
        <span>
          <div class="flex gap-1">
            <div class="flex items-center gap-0.5">
              <svg
                stroke="currentColor"
                fill="none"
                stroke-width="2"
                viewBox="0 0 24 24"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-5 w-5"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 3h8a2 2 0 0 1 2 2v1.82a5 5 0 0 0 .528 2.236l.944 1.888a5 5 0 0 1 .528 2.236v5.82a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-5.82a5 5 0 0 1 .528 -2.236l1.472 -2.944v-3a2 2 0 0 1 2 -2z"
                ></path>
                <path d="M14 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
                <path
                  d="M6 21a2 2 0 0 0 2 -2v-5.82a5 5 0 0 0 -.528 -2.236l-1.472 -2.944"
                ></path>
                <path d="M11 7h2"></path>
              </svg>
              <span>שקית</span>
            </div>
          </div>
        </span>
      </div>
      <div></div>
      <div class="text-[11px] mt-2 text-gray-900">
        *המידע הוזן ובאחריות בית המרקחת בלבד. מצאת טעות?
        <a
          class="underline text-blue-400"
          href="https://docs.google.com/forms/d/e/1FAIpQLSdQNHnXCBlc-gka0p-VYcwbP-z3j9Dc41s8VcJFNgGYOl2PjQ/viewform"
          target="_blank"
          rel="noreferrer"
        >
          דווח כאן
        </a>
      </div>
    </div>
  </div>
</div>
```
