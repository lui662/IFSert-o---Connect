import path from "path"
import fs from "fs"
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caminhoArquivo = path.join(__dirname, 'historico.json');

let historico = {}

function carregarHistorico() {
    try {
        if (fs.existsSync(caminhoArquivo)) {
            const dados = fs.readFileSync(caminhoArquivo, "utf-8")
            historico = JSON.parse(dados)
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        historico = {};
    }
}

function salvarHistorico() {
    try {
        fs.writeFileSync(caminhoArquivo, JSON.stringify(historico, null, 2))
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
    }
}

function adicionarHistorico(usuario, mensagem, resposta) {
    if (!historico[usuario]) {
        historico[usuario] = []
    }

    historico[usuario].push({
        mensagem,
        resposta,
        timestamp: new Date().toISOString()
    })

    salvarHistorico()
}

function obterHistorico(usuario) {
    return historico[usuario] || []
}

function excluirHistorico(usuario) {
    if (historico[usuario]) {
        delete historico[usuario]
        salvarHistorico()
        return true
    }

    return false
}

carregarHistorico()

export { adicionarHistorico, obterHistorico, excluirHistorico };