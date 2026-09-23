from rest_framework.views import exception_handler


def sgp_exception_handler(exc, context):
    """Padroniza o corpo de erro da API para o frontend consumir direto."""
    response = exception_handler(exc, context)
    if response is None:
        return None
    detalhe = response.data
    if isinstance(detalhe, dict) and "detail" in detalhe and len(detalhe) == 1:
        mensagem = detalhe["detail"]
    elif isinstance(detalhe, list):
        mensagem = "; ".join(str(d) for d in detalhe)
    elif isinstance(detalhe, dict):
        partes = []
        for campo, erros in detalhe.items():
            if isinstance(erros, (list, tuple)):
                partes.append(f"{campo}: {', '.join(str(e) for e in erros)}")
            else:
                partes.append(f"{campo}: {erros}")
        mensagem = "; ".join(partes)
    else:
        mensagem = str(detalhe)
    response.data = {
        "erro": True,
        "status": response.status_code,
        "mensagem": mensagem,
        "detalhes": detalhe,
    }
    return response
