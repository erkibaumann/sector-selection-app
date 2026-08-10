import html
import re
from pathlib import Path

source = Path("index (1).html").read_text(encoding="utf-8")
output_file = Path("../backend/database/data/sectors.php")

options = re.findall(
  r'<option value="(\d+)">(.*?)</option>',
  source,
)

parent_id_by_depth = {}
sectors = []

for id_text, raw_name in options:
  indentation = re.match(r"^(?:&nbsp;)*", raw_name).group()
  depth = indentation.count("&nbsp;") // 4

  sector_id = int(id_text)
  parent_id = None if depth == 0 else parent_id_by_depth[depth - 1]
  name = html.unescape(raw_name.removeprefix(indentation)).strip()

  sectors.append((sector_id, parent_id, name))
  parent_id_by_depth[depth] = sector_id

lines = ["<?php", "", "return ["]

for sector_id, parent_id, name in sectors:
  php_parent_id = "null" if parent_id is None else str(parent_id)
  php_name = name.replace("\\", "\\\\").replace("'", "\\'")

  lines.append(
      f"    ['id' => {sector_id}, "
      f"'parent_id' => {php_parent_id}, "
      f"'name' => '{php_name}'],"
  )

lines.append("];")

output_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"Wrote {len(sectors)} sectors to {output_file}")
