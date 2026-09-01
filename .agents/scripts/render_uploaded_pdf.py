from pathlib import Path
import fitz

source = Path("attached_assets/A_Four-Dimensional_Model_of_Life_and_Reality_1788240026051.pdf")
output = Path(".agents/outputs/four-dimensional-model")
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
for index, page in enumerate(document[:3], start=1):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    pixmap.save(output / f"page-{index}.png")

print(f"Rendered {min(3, len(document))} of {len(document)} pages to {output}")