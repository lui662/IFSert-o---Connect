import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { obterHistorico, adicionarHistorico, excluirHistorico } from '../history/historico.js';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({apiKey: "AIzaSyDMsyts9oyWs8x54-OSybCfsC2z6LNCGzI"});

// --- Lógica para servir os arquivos do frontend ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
app.use('/javascript', express.static(path.join(projectRoot, 'javascript')));
app.use('/style', express.static(path.join(projectRoot, 'style')));
app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'html', 'index.html'));
});

function promptComando(dadosDoSite, historico, mensagem) {
    return `
    # INSTRUÇÕES GERAIS
    Você é o "IFSertao Connect", um assistente virtual para o Campus Salgueiro do IFSertãoPE. Sua resposta deve ser baseada na sua "Base de Conhecimento" definida abaixo.

    # SUA BASE DE CONHECIMENTO
    Sua base de conhecimento é a soma de duas partes: as "Informações Fixas" e as "Informações do Site".

    ## 1. Informações Fixas (Suas Regras, Escopo e Exemplos)
    - **Escopo de Cursos Conhecidos:**
    - Ensino Médio Integrado: Agropecuária, Edificações, Informática.
    - Técnico Subsequente: Agropecuária (manhã e tarde), Edificações (noite).
    - Graduação: Tecnologia em Alimentos, Licenciatura em Física, Sistemas para Internet, Engenharia Civil.
    - FIC: Iniciação ao Xadrez, Costureira de Máquina Reta e Overloque, Manicure e Pedicure, Padeira, Salgadeira.
    - **Outras Informações de Escopo:** Processos seletivos, editais, informações de contato, notícias, projetos de extensão.
    - **Limitações:** Não responder sobre outros campi, questões pessoais ou informações de fora do site.
    - **Estilo de Resposta:** Linguagem clara, respeitosa e objetiva. Se uma informação dinâmica (como uma notícia) não for encontrada no conteúdo do site, informe que não encontrou.
    - **Exemplos de Respostas Boas:**
    - "Olá! Eu sou o IFSertao Connect..."
    - "Segundo a consulta realizada agora no site do IFSertão PE - Campus Salgueiro..."
    - **Exemplo de Resposta Fora de Escopo:**
    - "Desculpe, eu só posso responder dúvidas relacionadas ao conteúdo do site do IFSertão PE - Campus Salgueiro..."

    ## 2. Informações do Site (Conteúdo Dinâmico da Página Principal)
    --- INÍCIO DO CONTEÚDO DO SITE ---
    ${dadosDoSite}
    --- FIM DO CONTEÚDO DO SITE ---

    # SUA TAREFA
    Usando TODA a sua base de conhecimento (Informações Fixas + Informações do Site) e o histórico da conversa abaixo, responda à pergunta do usuário.

    --- HISTÓRICO DA CONVERSA ---
    ${historico}
    --- FIM DO HISTÓRICO ---

    **PERGUNTA DO USUÁRIO:** "${mensagem}"

    **SUA RESPOSTA:**
    `;
}
// --- FUNÇÃO gerarResposta (COMBINANDO AXIOS/CHEERIO COM A CHAMADA CORRETA DA API) ---
async function gerarResposta(usuario, mensagem) {
    try {
        // ETAPA 1: Buscar o conteúdo real do site com axios e cheerio
        let siteContent = "";
        try {
            const response = await axios.get('https://ifsertaope.edu.br/salgueiro/');
            const html = response.data;
            const $ = cheerio.load(html);
            siteContent = $('body').text();
        } catch (error) {
            console.error("Erro ao acessar ou processar o site: ", error);
            siteContent = "Não foi possível acessar o conteúdo do site no momento.";
        }
        
        const historicoDoUsuario = obterHistorico(usuario);
        const historicoTexto = historicoDoUsuario
            .map(item => `Usuário: ${item.mensagem}\nBot: ${item.resposta}`)
            .join('\n\n');
        
        const snippetDoSite = siteContent.replace(/\s\s+/g, ' ').trim().substring(0, 25000);

        // ETAPA 2: Montar o prompt com o conteúdo real extraído
        const promptFinal = promptComando(snippetDoSite, historicoTexto, mensagem)

        // ETAPA 3: Chamar a IA com o método correto (sem getGenerativeModel)
        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash", // Usando um modelo estável e eficiente
            contents: [{ parts: [{ text: promptFinal }] }],
        });

        const text = result.candidates[0].content.parts[0].text;

        adicionarHistorico(usuario, mensagem, text);
        return text;

    } catch (error) {
        console.error('Erro ao gerar resposta da IA:', error);
        return 'Desculpe, ocorreu um erro ao se comunicar com a IA.';
    }
}

// --- ROTAS DA API E SERVIDOR (sem alterações) ---
app.post('/gerar-resposta', async (req, res) => {
    const { usuario, mensagem } = req.body;
    if (!usuario || !mensagem) {
        return res.status(400).json({ error: 'Usuário e mensagem são obrigatórios' });
    }
    const resposta = await gerarResposta(usuario, mensagem);
    res.json({ resposta });
});

app.delete("/historico/:usuario", async (req, res) => {
    const { usuario } = req.params;
    if (excluirHistorico(usuario)) {
        return res.json({ mensagem: `Histórico do usuário ${usuario} excluído com sucesso` });
    }
    return res.status(404).json({ error: `Histórico não encontrado!` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));