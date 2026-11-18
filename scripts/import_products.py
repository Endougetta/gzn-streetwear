"""Convert the approved collection ZIP to catalog data and responsive WebP assets."""
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = {"Hoodies": "hoodies", "Sweatshirts": "sweatshirts", "Tshirts": "t-shirts", "hosen": "hosen"}
COLORS = {"Schwarz": "Schwarz", "Weiss": "Weiß", "Bordeaux": "Bordeaux",
          "Blau": "Blau", "Gruen": "Grün", "Espresso": "Espresso"}
VIEWS = {
    "lose_front": "Vorderseite", "lose_back": "Rückseite",
    "model_front": "Vorderseite am Model", "model_back": "Rückseite am Model",
    "closeup_front": "Detail vorne", "closeup_back": "Detail hinten",
    "gefaltet_front": "Gefaltete Ansicht",
}

def main():
    products = defaultdict(dict)
    with ZipFile(sys.argv[1]) as archive:
        for entry in archive.infolist():
            path = PurePosixPath(entry.filename)
            if len(path.parts) != 3 or path.parts[0].startswith("__") or path.suffix.lower() != ".png":
                continue
            category = FOLDERS.get(path.parent.name)
            if not category:
                continue
            matched = re.fullmatch(r"(.+)_(" + "|".join(COLORS) + r")_(" + "|".join(VIEWS) + r")", path.stem)
            if not matched:
                raise ValueError(f"Unknown catalog filename: {path.name}")
            name, color, view = matched.groups()
            key = category, name, color
            if view in products[key]:
                raise ValueError(f"Duplicate catalog view: {path.name}")
            slug = f"{category}-{name.replace('_', '-').lower()}-{color.lower()}"
            asset_dir = ROOT / "public" / "products" / slug
            asset_dir.mkdir(parents=True, exist_ok=True)
            with Image.open(io.BytesIO(archive.read(entry))) as original:
                image = ImageOps.exif_transpose(original).convert("RGB")
                for width in [480, 1120]:
                    version = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
                    version.save(asset_dir / f"{view}-{width}.webp", "WEBP", quality=83, method=4)
            products[key][view] = {"id": view, "label": VIEWS[view]}

    preferred = {
        "Hoodies": ["Shadow", "Not_That_Deep", "Keep_Building"],
        "Sweatshirts": ["GZN_College", "After_Hours", "GZN_Uniform"],
    }
    ordering = {category: preferred.get(folder, []) for folder, category in FOLDERS.items()}
    def product_order(key):
        category, name, color = key
        order = ordering[category]
        return list(FOLDERS.values()).index(category), order.index(name) if name in order else len(order), name, color

    catalog = []
    for category, name, color in sorted(products, key=product_order):
        images = products[category, name, color]
        catalog.append({
            "id": f"{category}-{name.replace('_', '-').lower()}-{color.lower()}",
            "category": category, "name": name.replace("_", " "),
            "color": COLORS[color], "images": [images[view] for view in VIEWS if view in images],
        })
    counts = [sum(p["category"] == c for p in catalog) for c in FOLDERS.values()]
    if counts != [3, 3, 3, 8] or sum(len(p["images"]) for p in catalog) != 71:
        raise ValueError(f"Unexpected catalog inventory: {counts}")
    (ROOT / "src" / "catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")
    print("Imported 17 products and 71 views.")

if __name__ == "__main__":
    main()
