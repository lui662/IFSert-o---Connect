from google import genai

cliente = genai.Client(api_key="AIzaSyDsdC5fIDUci-QpgJHJSQ04ZgiCXrqwJd0")


def messageChatBot(mensagem):
    
    msg = ""
    response = cliente.models.generate_content_stream(
        model="gemini-2.0-flash",
        contents=[mensagem]
    )

    for chuck in response:
        msg += chuck.text
    
    return msg


print(messageChatBot("quem descobriu o brasil? "))

    