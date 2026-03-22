#cosine similiarity and tf-idf
from preprocessing import clean_text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_similarity(text1, text2):

#cleaning texts
    text1 = clean_text(text1)
    text2 = clean_text(text2)

    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform([text1, text2])

    similarity = cosine_similarity(vectors[0], vectors[1])[0][0]

    return round(similarity*100, 2)