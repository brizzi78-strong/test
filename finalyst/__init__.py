"""finalyst -- a command-line financial analysis toolkit.

The package provides:
  * :mod:`finalyst.loader`  -- read financial statements and price series from CSV
  * :mod:`finalyst.ratios`  -- compute liquidity, profitability, leverage,
    efficiency and valuation ratios from statement line items
  * :mod:`finalyst.returns` -- analyze a price time series (CAGR, volatility,
    Sharpe ratio, maximum drawdown)
  * :mod:`finalyst.report`  -- render the analysis as readable text
  * :mod:`finalyst.cli`     -- the ``finalyst`` command-line entry point
"""

__version__ = "0.1.0"

__all__ = ["__version__"]
