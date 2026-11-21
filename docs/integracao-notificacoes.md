# Notificações por DM pelo bot nag4eyes

O Empty Variable não tem bot nem chama outros sistemas. Para avisar um membro no Discord, ele grava a
notificação numa caixa de saída (tabela `notificacao`) e o bot nag4eyes vem buscar, envia a DM e
confirma.

- **Eventos e dados de cada um:** `backend/src/notificacoes/eventos.ts` (fonte única do contrato).
- **Gravação:** `NotificacoesService.registrar`, chamada dentro da transação da mudança de negócio. Se
  a transação for desfeita, a notificação também é.
- **Integração desligada** (sem `INTEGRACAO_TOKEN`): nada é gravado e a fila responde 503.

## Quando cada evento é gravado

| Evento | Onde | Quem recebe |
|---|---|---|
| `RUN_PONTOS` | registro de run | cada jogador com lançamento na run (participante ou credor de empréstimo) |
| `RUN_CORRIGIDA` | correção de run | quem teve o saldo líquido alterado (quem saiu da run fica com `pontosDepois = 0`) |
| `TRANSFERENCIA_RECEBIDA` | transferência da carteira | o destinatário |
| `COMPRA_ENTREGUE` | entrega da compra | o comprador |
| `VENDA_CREDITADA` | entrega da compra com lote consignado | o dono do lote, uma vez por compra |
| `COMPRA_CANCELADA` | cancelamento pelo admin | o comprador |
| `OFERTA_APROVADA` / `OFERTA_REJEITADA` | análise da oferta de venda | o vendedor |
| `VINCULO_APROVADO` / `VINCULO_REJEITADO` | análise do vínculo | quem pediu |
| `NEBULA_ENTREGUE` / `NEBULA_REJEITADA` | entrega ou rejeição da Nebula | o solicitante |

Ninguém recebe aviso da própria ação: a compra, o cancelamento da própria compra ou da própria Nebula e
o envio de uma transferência não geram DM. Só recebe quem tem usuário ativo; jogador sem usuário não
gera notificação. Movimentos de estoque não avisam ninguém.

## Protocolo

Rotas `@Integracao()` (`Authorization: Bearer <INTEGRACAO_TOKEN>`):

### `POST /api/integracao/notificacoes/reservar`

Corpo opcional `{ "limite": 1..100 }` (padrão 50). Devolve as pendentes mais antigas e as reserva por
5 minutos:

```json
{
  "notificacoes": [
    {
      "id": "uuid",
      "discordId": "123456789012345678",
      "tipo": "RUN_PONTOS",
      "dados": { "runId": "uuid", "data": "2026-11-20", "pontos": 160, "...": "..." },
      "criadaEm": "2026-11-20T21:00:00.000Z",
      "tentativa": 1
    }
  ]
}
```

Enquanto reservada, a notificação não volta em outro lote. Sem confirmação até a reserva vencer, ela
volta com `tentativa` maior.

### `POST /api/integracao/notificacoes/confirmar`

```json
{ "resultados": [{ "id": "uuid", "status": "ENTREGUE" }, { "id": "uuid", "status": "FALHOU", "motivo": "DMs closed" }] }
```

De 1 a 100 itens; `motivo` opcional, até 200 caracteres. Resposta: `{ "confirmadas": 2, "ignoradas": [] }`.
Confirmada (entregue ou falha) não volta mais. Confirmar de novo, ou um ID desconhecido, não muda nada e o
ID vem em `ignoradas`: repetir a chamada é seguro.

## Garantias

A entrega é **pelo menos uma vez**. A confirmação garante só que a notificação não será entregue de novo
ao bot. Se o bot enviar a DM e cair antes de confirmar, a notificação volta depois da reserva. Para não
repetir a DM nesse caso, o nag4eyes guarda no próprio log de DMs o ID de cada notificação enviada e, ao
recebê-la de novo, só confirma. Sobra uma janela pequena: a DM saiu e o bot caiu antes de gravar o log.

Um membro com DMs fechadas não trava a fila: o bot confirma como `FALHOU` e segue.

## Retenção

Feita a cada `reservar`, porque o sistema não tem agendador:

- pendente com mais de **7 dias** vira `FALHOU` com motivo `expirada` e não é enviada (aviso velho é ruído);
- pendente entregue **10 vezes** sem confirmação vira `FALHOU` com motivo `sem confirmação`;
- confirmada há mais de **30 dias** é apagada.

Com o token configurado e o bot parado, as pendentes se acumulam até o bot voltar; ao voltar, as de mais de
7 dias expiram antes do primeiro lote.
