![Contributors][contributors-shield]
![Forks][forks-shield]
![Stargazers][stars-shield]
![Issues][issues-shield]

# Stock API
[![Codacy Badge][codacy-repo]][codacy-badge]
<p>This API allows to fetch stock price and related information for a given stock ticker and exchange..</p>

<div align="center">
  <a href="https://chat-webapp-mern.netlify.app/"><img src="https://github.com/SinghAstra/Chat-WebApp/blob/main/images/chat.png"/></a>
</div>



## Installation

1. Clone the repository:
   ```console
       git clone <repository_url>
   ```
   
2. Install dependencies:
   ```console
       pip install -r requirements.txt
   ```

## Usage
1. Run the flask server:
    ```console
    python app.py
    ```
2. Access the API at http://localhost:5000/

## EndPoints
  - **GET /stock_price** :  Fetches stock price and related information for a given stock ticker and exchange.
    - **Query Parameters**:
      - ticker: The stock ticker symbol (required)
      - exchange: The stock exchange (required)
      - Example Request :
        ```console
        http://localhost:5000](https://stock-api-gbbj.onrender.com/stock_price?ticker=GOOG&exchange=NASDAQ
        ```
        - Example Response :
        ```console
        {
        "Avg Volume": "20.96M",
        "Day range": "$151.08 - $154.84",
        "Dividend yield": "-",
        "Market cap": "1.90T USD",
        "P/E ratio": "28.37",
        "Previous close": "$151.94",
        "Primary exchange": "NASDAQ",
        "Stock Price": "$153.94",
        "Year range": "$103.27 - $157.00"
        }
        ```
  - **GET /** - Welcome message.


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/SinghAstra/Stock-API.svg?style=for-the-badge
[contributors-url]: https://github.com/SinghAstra/Stock-API/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/SinghAstra/Stock-API.svg?style=for-the-badge
[forks-url]: https://github.com/SinghAstra/Stock-API/network/members
[stars-shield]: https://img.shields.io/github/stars/SinghAstra/Stock-API.svg?style=for-the-badge
[stars-url]: https://github.com/SinghAstra/Stock-API/stargazers
[issues-shield]: https://img.shields.io/github/issues/SinghAstra/Stock-API.svg?style=for-the-badge
[issues-url]: https://github.com/SinghAstra/Stock-API/issues
[codacy-repo]:https://app.codacy.com/project/badge/Grade/614b6b9701ff4d969ab7c06cae5ef61b
[codacy-badge]:https://app.codacy.com/gh/SinghAstra/Stock-API/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade
