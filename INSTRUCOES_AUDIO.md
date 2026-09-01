# Atualização dos áudios da TV

Extraia o ZIP na raiz do projeto `bingo` e confirme a substituição dos arquivos.

## O que foi alterado

- As locuções antigas das bolas deixaram de ser usadas pela TV.
- Foram adicionadas cinco locuções completas para as bolas 1 a 75.
- A TV usa, por padrão, o rodízio entre as cinco vozes. No rodapé da TV é possível fixar uma delas.
- Os oito áudios gerais estão disponíveis em **Rodada ao vivo > Áudios da TV**.
- Término das compras é reproduzido ao iniciar a rodada; Encerrado é reproduzido ao finalizar.
- Os demais avisos ficam sob controle manual do operador para não atribuir um significado incorreto aos nomes recebidos.
- Se um áudio de bola falhar, a voz do navegador continua funcionando como contingência.
- Os arquivos das bolas 76 a 90 não fazem parte desta atualização.

## Validação rápida

1. Inicie o backend e o frontend.
2. Abra a TV da sala e clique em **Ativar transmissão com som**.
3. Crie e inicie uma rodada.
4. Sorteie pelo menos cinco bolas para ouvir o rodízio das cinco vozes.
5. No painel do operador, use os oito botões de **Áudios da TV** para testar os avisos gerais.

O navegador exige o primeiro clique na TV para autorizar a reprodução de som. Sem essa confirmação, nenhum site pode iniciar áudio automaticamente.
