import requests
from bs4 import BeautifulSoup
import time

ticker = 'INFY'
exchange = 'NSE'
url_nse=f"https://www.google.com/finance/quote/{ticker}:{exchange}"
url_boe="https://www.google.com/finance/quote/500209:BOM"

headers = {}  


while True:
    search_response=requests.get(url_nse,headers = headers)
    if search_response.status_code == 200:
        soup=BeautifulSoup(search_response.content,'html.parser')
        nse_price = float(soup.find('div',{'class':"YMlKec fxKbKc"}).get_text().replace("₹", "").replace(",", ""))
        print("nse price is ",nse_price)
    time.sleep(1)