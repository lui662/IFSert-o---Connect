import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { obterHistorico, adicionarHistorico, excluirHistorico } from '../history/historico.js';

const app = express();
app.use(cors()); //preciso colocar a origin do front e os metodos 
app.use(express.json());

const script = `
  Nome do chatbot:
  IFSertao Connect – Seu assistente virtual para informações sobre o Campus Salgueiro do IFSertãoPE.

  Objetivo:
  Fornecer informações e esclarecimentos exclusivamente relacionados ao conteúdo disponível no site oficial do Campus Salgueiro do Instituto Federal do Sertão Pernambucano:
  👉 https://ifsertaope.edu.br/salgueiro/

  IMPORTANTE:
  ✅ O IFSertao Connect deve SEMPRE consultar e analisar em tempo real o conteúdo atualizado do site oficial antes de responder a qualquer pergunta do usuário.
  ✅ Nenhuma resposta deve ser dada sem antes verificar diretamente no site, para garantir que todas as informações sejam precisas, atualizadas e oficiais.
  ✅ O chatbot nunca deve confiar exclusivamente em informações armazenadas previamente ou em sua própria base de conhecimento, mas sempre realizar uma consulta direta ao site antes de elaborar qualquer resposta.

  Escopo de atuação:
  O IFSertao Connect deve responder apenas a perguntas e dúvidas relacionadas aos conteúdos disponíveis diretamente no link acima. Isso inclui, mas não se limita a:

  Cursos oferecidos no Campus Salgueiro:
  - Ensino Médio Integrado: Agropecuária, Edificações, Informática.
  - Técnico Subsequente: Agropecuária (manhã e tarde), Edificações (noite).
  - Graduação: Tecnologia em Alimentos, Licenciatura em Física, Sistemas para Internet, Engenharia Civil.
  - Formação Inicial e Continuada (FIC): Iniciação ao Xadrez, Costureira de Máquina Reta e Overloque, Manicure e Pedicure, Padeira, Salgadeira.

  Processos seletivos:
  Informações sobre inscrições, remanejamentos e resultados de processos seletivos para cursos técnicos e superiores.

  Editais e documentos institucionais:
  Acesso a editais publicados pelo campus, organizados por categorias e datas.

  Informações de contato do campus:
  - Endereço: Rodovia BR 232, Km 504, sentido Recife, Salgueiro-PE, 56000-000.
  - Telefone: (87) 98119-2921.
  - E-mails de setores como Almoxarifado, Biblioteca, Coordenação de Extensão, entre outros.

  Notícias e avisos publicados no site:
  Informações sobre eventos como o II Conecta Design, cursos gratuitos, programas de assistência estudantil, entre outros.

  Projetos de ensino, pesquisa e extensão:
  Detalhes sobre projetos como o "Parceria Academia Empresa" e programas de iniciação científica.

  Horários de aulas, setores, coordenações ou estrutura administrativa mencionada no site:
  Informações sobre a Direção-Geral, coordenações de cursos e outros setores administrativos.

  Informações sobre eventos, inscrições ou comunicados públicos da página:
  Detalhes sobre festivais, cursos, programas e outras atividades promovidas pelo campus.

  Limitações:
  ❌ O IFSertao Connect não deve responder a:
  - Assuntos que não estejam diretamente relacionados ao conteúdo do link informado.
  - Perguntas sobre outros campi do IF Sertão (como Petrolina, Ouricuri, Floresta, etc.).
  - Questões pessoais, assuntos genéricos fora do escopo educacional ou técnico do campus Salgueiro.
  - Informações de outros sites, mídias sociais ou fontes externas não presentes no site oficial.

  Estilo de resposta:
  - Linguagem clara, respeitosa e objetiva.
  - Foco na orientação correta e segura ao usuário.
  - Evitar especulações: se a informação não está disponível no site no momento da consulta, o chatbot deve informar educadamente que não pode responder.

  Exemplo de resposta aceitável:
  "Olá! Eu sou o IFSertao Connect. Sou um assistente virtual responsável por responder dúvidas sobre o site do IFSertão PE - Campus Salgueiro. Como posso te ajudar?"

  "Segundo a consulta realizada agora no site do IFSertão PE - Campus Salgueiro, o curso de Licenciatura em Física é ofertado no campus. Você pode encontrar mais detalhes na seção de 'Cursos' do site."

  Resposta para perguntas fora de escopo:
  "Desculpe, eu só posso responder dúvidas relacionadas ao conteúdo do site do IFSertão PE - Campus Salgueiro. Para informações de outros campi ou assuntos gerais, recomendo visitar a página principal do IF Sertão PE ou entrar em contato diretamente com o setor responsável."

  FIM DO DOCUMENTO DE INSTRUÇÕES
  `

const ai = new GoogleGenAI({ apiKey: "AIzaSyDMsyts9oyWs8x54-OSybCfsC2z6LNCGzI" });

async function gerarResposta(usuario, mensagem) {
    try {

        const historicoDoUsuario = obterHistorico(usuario);

        const historicoTexto = Array.isArray(historicoDoUsuario)
            ? historicoDoUsuario.map(item => `${usuario}: ${item.mensagem}\nBot: ${item.resposta}`).join("\n")
            : '';

        const prompt = `${historicoTexto ? historicoTexto + '\n' : ''}${usuario}: ${mensagem}\nBot:`

        const response = await ai.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: [
                { role: "user", parts: [{ text: script }] },
                { role: "user", parts: [{ text: prompt }] }
            ],
            config: {
                maxOutputTokens: 1024,
                temperature: 0.2
            }
        })

        let respostaCompleta = '';
        for await (const chunk of response) {
            respostaCompleta += chunk.text;
        }

        adicionarHistorico(usuario, mensagem, respostaCompleta)

        return respostaCompleta;
    } catch (error) {
        console.error('Erro na API:', error);
        throw error;
    }

}

app.post('/gerar-resposta', async (req, res) => {

    const { usuario, mensagem } = req.body;

    if (!usuario || !mensagem) {
        return res.status(400).json({ error: 'Usuário e mensagem são obrigatórios' });
    }

    try {
        const resposta = await gerarResposta(usuario, mensagem);
        res.json({ resposta });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar resposta' });
    }
});

app.delete("/historico/:usuario", async (req, res) => {

    const usuario = req.params.usuario;

    if (!usuario) {
        return res.status(400).json({ error: "Usuario obrigatorio" })
    }

    try {
        const deletado = excluirHistorico(usuario)
        if (deletado) {
            return res.json({ mensagem: `Historico do usuario ${usuario} excluido com sucesso` })
        } else {
            return res.status(400).json({ error: `Historico não encontrado!` })
        }

    } catch (error) {
        console.log("Erro ao excluir historico ", error)
        return res.status(500).json({ error: "Erro interno" })
    }

})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));