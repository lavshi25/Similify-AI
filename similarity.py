#cosine similiarity and tf-idf
from preprocessing import clean_text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from nltk.tokenize import sent_tokenize

def calculate_similarity(text1, text2):

#cleaning texts
    text1 = clean_text(text1)
    text2 = clean_text(text2)

    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform([text1, text2])

    similarity = cosine_similarity(vectors[0], vectors[1])[0][0]

    return round(similarity*100, 2)

def sentence_similarity(text1, text2):

    sentences1 = sent_tokenize(text1)
    sentences2 = sent_tokenize(text2)

    results = []

    for s1 in sentences1:

        best_score = 0
        best_match = ""

        for s2 in sentences2:

            vectorizer = TfidfVectorizer()

            vectors = vectorizer.fit_transform([s1, s2])

            score = cosine_similarity(vectors[0], vectors[1])[0][0]

            if score > best_score:
                best_score = score
                best_match = s2

        results.append({
            "sentence": s1,
            "match": best_match,
            "score": round(best_score * 100, 2)
        })

    return results