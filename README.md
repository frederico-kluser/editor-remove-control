# Editor Control Extension

Uma extensão do VSCode que permite o controle programático de múltiplas instâncias do VSCode, Cursor IDE e WindSurf. A extensão expõe endpoints de API REST e conexões WebSocket para identificar instâncias, listar comandos disponíveis, executar comandos e acessar o console do Electron DevTools.

## Recursos

- Identificação de instâncias do editor
- API REST para controle remoto
- Conexão WebSocket para comunicação em tempo real
- Execução de comandos remotamente
- Acesso ao console do Electron DevTools

## Requisitos

- Node.js (v16.x ou posterior)
- npm (v8.x ou posterior)
- Visual Studio Code, Cursor IDE ou WindSurf

## Instalação

1. Baixe o arquivo `.vsix` da extensão
2. Abra o VS Code
3. Vá para a visualização de Extensões (Ctrl+Shift+X)
4. Clique no menu "..." no canto superior direito
5. Selecione "Instalar a partir do VSIX..."
6. Navegue até e selecione o arquivo `.vsix`

## Uso

### Iniciando os Servidores

A extensão inicia automaticamente os servidores API e WebSocket quando é ativada. Você também pode iniciar e parar os servidores manualmente:

- Pressione `Ctrl+Shift+P` para abrir a paleta de comandos
- Digite "Iniciar Servidor de Controle do Editor" para iniciar os servidores
- Digite "Parar Servidor de Controle do Editor" para parar os servidores

### Configuração

Você pode personalizar a extensão através das configurações do VS Code:

- `editorControl.port`: Número da porta para o servidor de controle (padrão: 3000)
- `editorControl.wsPort`: Número da porta para o servidor WebSocket (padrão: 3001)
- `editorControl.autoStart`: Iniciar automaticamente o servidor de controle na ativação da extensão (padrão: true)

### API REST

A extensão expõe os seguintes endpoints API:

- `GET /api/instances`: Retorna informações sobre a instância atual do editor
- `GET /api/commands`: Lista todos os comandos disponíveis
- `POST /api/commands/execute`: Executa um comando
- `POST /api/devtools/toggle`: Alterna a visibilidade do Electron DevTools
- `POST /api/devtools/execute`: Executa um script no console do DevTools

### WebSocket

A conexão WebSocket suporta as seguintes mensagens:

- `ping`: Verifica se o servidor está ativo
- `execute_command`: Executa um comando no editor
- `get_instance_info`: Obtém informações sobre a instância atual
- `toggle_devtools`: Alterna a visibilidade do DevTools

## Desenvolvimento

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Compile a extensão: `npm run compile`
4. Pressione F5 para iniciar a extensão em modo de desenvolvimento

## Licença

[MIT](LICENSE)