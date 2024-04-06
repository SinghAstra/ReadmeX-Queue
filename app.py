from flask import Flask,jsonify,request
from bs4 import BeautifulSoup
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

def fetch_stock_data(ticker, exchange):
    url = f"https://www.google.com/finance/quote/{ticker}:{exchange}"
    headers = {}
    try:
        search_response = requests.get(url, headers=headers)
        if search_response.status_code == 200:
            soup = BeautifulSoup(search_response.content, 'html.parser')
            data = {}
            stock_price  = soup.find("div",{"class":"YMlKec fxKbKc"}).get_text()
            data["Stock Price"] = stock_price
            dataDivs = soup.find_all("div", {"class": "gyFHrc"})
            for dataDiv in dataDivs:
                key = dataDiv.find("span").find("div", {"class": "mfs7Fc"})
                if key is not None:
                    key = key.get_text()
                    val = dataDiv.findChild("div" ,{"class":"P6K39c"} ).get_text()
                    data[key] = val
            return data
        else:
            return None
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

@app.route('/stock_price')
def get_stock_info():
    ticker = request.args.get('ticker')
    exchange = request.args.get('exchange')
    if not ticker or not exchange:
        return jsonify({'error': 'Ticker and exchange are required'}), 400
    data = fetch_stock_data(ticker, exchange)
    if data is not None:
        return jsonify(data)
    else:
        return jsonify({'error': 'Failed to fetch data'})


@app.route('/')
def index():
    return '<h1>Welcome to Stock Price API!</h1>'

if __name__ == '__main__':
    app.run()