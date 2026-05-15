#bridge api, takes user input,calls similarity function and gives the JSON response
#User → app.py → similarity.py → result → app.py → user

from flask import Flask, jsonify, request, render_template
from similarity import calculate_similarity
from flask import render_template
from similarity import calculate_similarity, sentence_similarity

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")
    
@app.route("/analyze", methods = ["POST"])
def analyze():

     data = request.json

     text_1 = data.get("text1")
     text_2 = data.get("text2")

     score = calculate_similarity(text_1, text_2)
     print(score)

     if score>80:
        status =  "Plagiarized"
     else:
        status = "Not Plagiarized"

     sentence_results = sentence_similarity(text_1, text_2)

     return jsonify({
    "similarity_score": score / 100,

    "sentence_similarities": [
        {
            "sentence1": item["sentence"],
            "sentence2": item["match"],
            "score": item["score"] / 100
        }
        for item in sentence_results
    ]
})

     
if __name__ == "__main__":
    app.run(debug = "True")

    
    
