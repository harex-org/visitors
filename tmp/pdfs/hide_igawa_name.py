from pathlib import Path

import fitz


source = Path("校内掲示用ポスター.pdf")
output = Path("output/pdf/校内掲示用ポスター_井川雄一朗氏名非表示.pdf")
output.parent.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
page = document[0]

# Cover only the speaker name on the 14:30 entry. The surrounding area is plain white.
name_area = fitz.Rect(227.0, 610.0, 279.5, 636.0)
page.draw_rect(name_area, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

document.save(output, garbage=4, deflate=True)
document.close()
