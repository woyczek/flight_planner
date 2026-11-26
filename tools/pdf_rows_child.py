"""Isolated, bounded PDF child returning coordinate-ordered text for coding tables.

Uses the existing pdf_guard child protocol and the shared proc_pdf row reconstruction.
Only the child imports pypdf; ordinary SID charts keep the existing raw-text child.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pdf_child import _setup


def main():
    path, out = sys.argv[1:3]
    first, last, max_chars = map(int, sys.argv[3:6])
    reader_class, counter = _setup(json.loads(sys.argv[6]))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from proc_pdf import rows_from_pdf
    reader = reader_class(path)
    total = len(reader.pages)
    texts = ['\n'.join(rows_from_pdf(path, i, reader))[:max_chars] for i in range(first, min(last, total))]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'pages': total, 'texts': texts, 'fonts': min(counter.n, 1_000_000)}, f,
                  ensure_ascii=False, allow_nan=False)


if __name__ == '__main__':
    main()
