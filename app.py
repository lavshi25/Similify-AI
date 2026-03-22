#bridge api, takes user input,calls similarity function and gives the JSON response
#User → app.py → similarity.py → result → app.py → user

from flask import Flask, jsonify, request
from similarity import calculate_similarity

app = Flask(__name__)
if __name__ == "__main__":
    app.run(debug = "True")
    

    @app.route("/analyze", methods = ["POST"])
    def analyze():

     data = request.json

     text_1 = data.get("text1")
     text_2 = data.get("text2")

     score = calculate_similarity(text_1, text_2)

     if score>80:
        status =  "plagarised"
     else:
        status = "unplagrised"

     return jsonify({
        "similarity" : score,
        "status" : status    
        })

    
    
