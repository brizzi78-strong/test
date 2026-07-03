"""Start Ledgerly: python run.py  (then open http://localhost:5000)"""

from ledgerly import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
