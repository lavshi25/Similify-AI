#lower texts, clean the mess, remove symbols, make text ready for ml
import re

def clean_text(text):
    text = text.lower() #lower doesnt take arguments

    text = re.sub(r'[^a-zA-Z0-9\s]', '', text) #regular expression, remove symbols

    return text