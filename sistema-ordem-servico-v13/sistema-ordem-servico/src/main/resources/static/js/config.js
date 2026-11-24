// Endereço da API. Vazio = mesma origem (o Spring serve o front e a API na porta 8080).
// Só altere se abrir o front por outro servidor (ex.: Live Server), por exemplo:
//   window.APP_CONFIG = { apiBase: 'http://localhost:8080' };
// Nesse caso a API precisaria liberar CORS. O caminho mais simples é abrir http://localhost:8080.
window.APP_CONFIG = { apiBase: '' };
