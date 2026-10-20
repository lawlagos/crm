# Primeiro uso

## Computador

Validado em Windows x64, Node 22.22.0 e npm 10.9.4. No diretório do projeto:

```powershell
npm ci
npm run db:migrate
npm run build
npm start
```

Abra http://127.0.0.1:3000 e mantenha o terminal aberto. Ctrl+C encerra o servidor. Migração e restauração exigem servidor parado; o lock da base bloqueia manutenção concorrente.

A base real fica em `%LOCALAPPDATA%\Central\data\central.sqlite`. Nasce somente com quatro frentes e preferências, sem clientes ou valores fictícios. Para experimentar separadamente:

```powershell
npm run db:migrate -- --demo
npm run dev -- --demo
```

O modo demonstração usa `%LOCALAPPDATA%\Central\demo-data`, com faixa identificadora. `CENTRAL_DATA_DIR` permite outro caminho absoluto fora de pastas sincronizadas; scripts leem as variáveis do processo. Exemplo PowerShell: `$env:CENTRAL_DATA_DIR='C:\Central-data'`.

Ajuste jornada e disponibilidade em Configurações. Capture tarefas e cadastre clientes conforme sua rotina. Ganhar uma venda cria previsões; somente Registrar recebimento indica dinheiro recebido. Estorno corrige o registro local e não transfere dinheiro.

## Backup e recuperação

Backups diários são verificados no startup e a cada hora, com servidor ativo. A retenção conserva os 14 automáticos mais recentes e representantes de oito semanas; esses conjuntos podem se sobrepor. Manuais são preservados.

```powershell
npm run data:backup
```

Também há Criar backup/Baixar backup em Configurações. Pastas padrão: `%LOCALAPPDATA%\Central\data-backups` ou `demo-data-backups`. Cada arquivo possui manifesto SHA-256 e schema. Guarde cópia externa. CSV filtrado é parcial e não substitui backup.

Para restaurar, encerre o servidor:

```powershell
npm run data:restore -- 'C:\caminho\backup.sqlite'
```

Acrescente `--demo` para demonstração. A ferramenta verifica integridade, FKs, schema e hash quando o manifesto acompanha o arquivo; preserva backup anterior, prepara cópia no mesmo volume e substitui a base. Não há restauração por HTTP. Depois execute `npm start` e confira os registros.

Resposta incerta: use Verificar resultado na mesma tela; a chave original evita duplicação. Conflito: copie o rascunho e recarregue. Não crie outro pagamento para adivinhar o resultado do primeiro.

## Telefone e HTTPS local

Launcher e manifesto implementados; instalação em aparelho físico **pendente**. PC e telefone precisam estar na mesma rede privada, com o computador ligado. Localhost no telefone não aponta para o PC.

```powershell
npm run lan:install
npm run start:lan -- -PrivateIp 192.168.1.50 -Demo
```

Substitua o IP de exemplo pelo IPv4 privado do PC. Execute com servidor comum parado e build pronto. Omitir `-Demo` usa a base real. Porta padrão 3443; alterar com `-HttpsPort`. `-ValidateOnly` valida sem iniciar listener.

O instalador verifica SHA-256 do Caddy 2.11.7 x64 oficial e extrai em `.tooling/caddy`, sem serviço ou PATH global. Node permanece em 127.0.0.1:3000; Caddy faz bind somente no IPv4 informado. A aplicação permite exatamente essa origem HTTPS.

Configuração, logs e CA ficam em `%LOCALAPPDATA%\Central\runtime`. Certificado público: `caddy-data\pki\authorities\local\root.crt`. A instalação automática de confiança está desativada. Transfira apenas root.crt; nunca root.key ou outras chaves. Veja [CA local](https://caddyserver.com/docs/automatic-https#local-https) e [skip_install_trust](https://caddyserver.com/docs/caddyfile/options#skip-install-trust).

No iPhone, instale a CA e habilite confiança SSL nos ajustes; abra no Safari e use Compartilhar → Adicionar à Tela de Início. No Android, configure a CA conforme o aparelho e confira se o navegador oferece PWA standalone ou atalho. O endereço https://IP-DO-PC:3443 deve abrir sem aviso.

O launcher não cria regras de firewall. Se houver bloqueio, liberar somente a porta escolhida na rede privada/dispositivos de confiança. Não liberar rede pública nem encaminhar porta no roteador. Sem login, quem alcançar a origem autorizada poderá operar a base; HTTPS não seleciona usuários.

Aceite pendente no aparelho: instalar/abrir ícone, criar no PC e editar no telefone, testar edição antiga, perder Wi-Fi, desligar servidor e reconectar. Registrar sistema, navegador e resultado. Emulação móvel não substitui esse aceite.
