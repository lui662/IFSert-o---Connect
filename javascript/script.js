function setStatusDesabilitado(elemento, desabilitado) {
    elemento.disabled = desabilitado
    elemento.style.backgroundColor = desabilitado ? "#696969" : ""
    elemento.style.cursor = desabilitado ? "not-allowed" : "auto"
}

function receberMensagem() {

    let mensagemDoUsuario = document.getElementById("inputStyle")
    let carregando = document.getElementById("div-carregando")
    let botao = document.getElementById("btn-enviar")

    if (!mensagemDoUsuario.value) {
        mensagemDoUsuario.placeholder = "O campo está vazio!"
        mensagemDoUsuario.style.border = "1px solid red"
        return
    }

    mensagemDoUsuario.style.border = "none"
    carregando.innerHTML = `<img src="../img/carregando.gif" alt="carregando" id="carregando-img">`

    setStatusDesabilitado(mensagemDoUsuario, true)
    setStatusDesabilitado(botao, true)

    fetch('http://localhost:3000/gerar-resposta', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            usuario: "luiz",
            mensagem: mensagemDoUsuario.value
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            mostrarMensagem(mensagemDoUsuario.value, data.resposta);
            mensagemDoUsuario.value = "";
        })
        .catch(error => {
            console.log("error: ", error);
            alert("Ocorreu um erro ao enviar sua mensagem. Volte mais tarde!");
        })
        .finally(() => {
            setStatusDesabilitado(mensagemDoUsuario, false);
            setStatusDesabilitado(botao, false);
            carregando.innerHTML = "";
        });

}

function mostrarMensagem(pergunta, resposta) {

    let historico = document.getElementById("historico")

    resposta = marked.parse(resposta);

    //mensagem do usuario
    let boxMinhasMensagem = document.createElement("div")
    boxMinhasMensagem.className = "box-minhas-mensagem"

    let minhaMensagem = document.createElement("p")
    minhaMensagem.className = "minha-mensagem"
    minhaMensagem.innerHTML = pergunta

    boxMinhasMensagem.appendChild(minhaMensagem)
    historico.appendChild(boxMinhasMensagem)

    //mensagem do chat
    let boxRespostaDoChat = document.createElement("div")
    boxRespostaDoChat.className = "box-resposta-do-chat"

    let respostaMensagem = document.createElement("p")
    respostaMensagem.className = "resposta-mensagem"
    respostaMensagem.innerHTML = resposta

    boxRespostaDoChat.appendChild(respostaMensagem)
    historico.appendChild(boxRespostaDoChat)

}

function apagarHistorico() {

    fetch('http://localhost:3000/historico/luiz', {
        method: 'DELETE',
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            alert("Historico excluido com sucesso")
            document.getElementById("historico").innerHTML = ""
        })
        .catch(error => {
            console.log("error: ", error);
            alert("Ocorreu um erro ao excluir o historico. Volte mais tarde!");
        })

}