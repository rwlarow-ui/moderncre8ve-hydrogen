"""
Fix all Weaverse page JSONs: move component settings into `data` object.

The HydrogenComponentData interface requires:
  { id: string, type: string, data?: Record<string, any>, children?: [{id}] }

Our files have settings flat on the item - they need to be nested in `data`.
"""

import json, glob, os

RESERVED_KEYS = {"id", "type", "children", "data", "createdAt", "updatedAt", "deletedAt"}

base = os.path.dirname(os.path.abspath(__file__))
for filepath in sorted(glob.glob(os.path.join(base, "*.json"))):
    name = os.path.basename(filepath)
    with open(filepath) as f:
        page = json.load(f)

    fixed_items = []
    for item in page["items"]:
        new_item = {}
        data = {}
        for key, value in item.items():
            if key in RESERVED_KEYS:
                new_item[key] = value
            else:
                data[key] = value
        if data:
            new_item["data"] = data
        fixed_items.append(new_item)

    page["items"] = fixed_items

    with open(filepath, "w") as f:
        json.dump(page, f, indent=2)

    print(f"Fixed {name}: {len(fixed_items)} items")

print("\nDone!")
