from flask import Flask,jsonify
from bs4 import BeautifulSoup
import requests

app = Flask(__name__)
print("__name__ is ",__name__)

def fetch_stock_price(ticker, exchange):
    url = f"https://www.google.com/finance/quote/{ticker}:{exchange}"
    headers = {}
    try:
        search_response = requests.get(url, headers=headers)
        if search_response.status_code == 200:
            soup = BeautifulSoup(search_response.content, 'html.parser')
            nse_price = float(soup.find('div', {'class': "YMlKec fxKbKc"}).get_text().replace("₹", "").replace(",", ""))
            return nse_price
        else:
            return None
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

@app.route('/stock_price')
def get_stock_price():
    ticker = 'INFY'
    exchange = 'NSE'
    price = fetch_stock_price(ticker, exchange)
    if price is not None:
        return jsonify({'price': price})
    else:
        return jsonify({'error': 'Failed to fetch data'})


@app.route('/')
def index():
    return '<h1>Welcome to Stock Price API!</h1>'

if __name__ == '__main__':
    app.run(debug=True)