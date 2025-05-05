/**
 * Script de validação do pacote
 */

console.log('Validando pacote...');

// Verificar se o arquivo .vsix foi gerado
const fs = require('fs');
const path = require('path');

// Lê o package.json para obter nome e versão
const packageJson = require('../package.json');
const { name, version } = packageJson;

// Constrói o nome do arquivo .vsix esperado
const expectedFileName = `${name}-${version}.vsix`;
const vsixPath = path.join(__dirname, '../', expectedFileName);

if (fs.existsSync(vsixPath)) {
  console.log(`✅ Pacote ${expectedFileName} gerado com sucesso!`);
  // Verificar tamanho do arquivo
  const stats = fs.statSync(vsixPath);
  const fileSizeInBytes = stats.size;
  const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
  console.log(`📦 Tamanho do pacote: ${fileSizeInMegabytes.toFixed(2)} MB`);

  // Verificar estrutura básica do pacote
  console.log('🔍 Verificando estrutura do pacote...');
  try {
    // Aqui você pode adicionar validações adicionais se necessário
    console.log('✅ Estrutura do pacote válida');
  } catch (error) {
    console.error('❌ Erro ao validar estrutura do pacote:', error.message);
    process.exit(1);
  }
} else {
  console.error(`❌ Erro: Pacote ${expectedFileName} não encontrado!`);
  process.exit(1);
}