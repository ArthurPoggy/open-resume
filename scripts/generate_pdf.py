"""
Gerador de PDF do OpenResume via API.

Uso:
    python scripts/generate_pdf.py scripts/sample-resume.json
    python scripts/generate_pdf.py scripts/sample-resume.json --output curriculo.pdf
    python scripts/generate_pdf.py scripts/sample-resume.json --url http://outro-servidor:3000
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Dependência ausente. Instale com: pip install requests")
    sys.exit(1)


def generate_pdf(json_path: str, output_path: str | None, api_url: str) -> None:
    json_file = Path(json_path)
    if not json_file.exists():
        print(f"Erro: arquivo '{json_path}' nao encontrado.")
        sys.exit(1)

    with json_file.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if "resume" not in payload:
        print("Erro: o JSON deve ter o campo 'resume' na raiz.")
        sys.exit(1)

    # Nome do arquivo de saída: usa o nome do candidato se disponível
    name = payload.get("resume", {}).get("profile", {}).get("name", "resume")
    if not output_path:
        safe_name = "".join(c for c in name if c.isalnum() or c in " -_").strip()
        output_path = f"{safe_name or 'resume'} - Resume.pdf"

    print(f"Enviando para {api_url} ...")

    try:
        response = requests.post(
            api_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60,
        )
    except requests.exceptions.ConnectionError:
        print(f"Erro: nao foi possivel conectar em {api_url}")
        print("Verifique se o servidor esta rodando com: npm run dev")
        sys.exit(1)

    if response.status_code == 200:
        output_file = Path(output_path)
        output_file.write_bytes(response.content)
        size_kb = len(response.content) / 1024

        page_count = response.headers.get("X-Page-Count", "?")
        font_size = response.headers.get("X-Font-Size-Used", "?")

        print(f"PDF gerado com sucesso: {output_file} ({size_kb:.1f} KB)")
        print(f"  Páginas: {page_count}  |  Font size usado: {font_size}pt")

        if page_count != "1":
            print(
                f"  Aviso: o conteúdo não coube em 1 página mesmo no tamanho mínimo ({font_size}pt)."
            )
    else:
        print(f"Erro HTTP {response.status_code}:")
        try:
            print(response.json().get("error", response.text))
        except Exception:
            print(response.text)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gera PDF de curriculo a partir de um JSON via OpenResume API"
    )
    parser.add_argument(
        "json",
        help="Caminho para o arquivo JSON com os dados do curriculo",
    )
    parser.add_argument(
        "--output", "-o",
        help="Caminho do PDF de saida (padrao: '<nome> - Resume.pdf')",
        default=None,
    )
    parser.add_argument(
        "--url",
        help="URL base da API (padrao: http://localhost:3000)",
        default="http://localhost:3000",
    )
    args = parser.parse_args()

    api_url = args.url.rstrip("/") + "/api/generate-pdf"
    generate_pdf(args.json, args.output, api_url)


if __name__ == "__main__":
    main()
