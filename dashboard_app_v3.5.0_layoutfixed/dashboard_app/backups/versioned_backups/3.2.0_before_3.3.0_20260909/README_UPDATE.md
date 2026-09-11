# DHA Data Dashboard 1.3.0 update

The loader now reads `CARBON_TABULAR(%WGT)!K21`, cleans it with the existing numeric-value validator, and writes the result to `Unknowns` on every component row generated for that XLS file. The frontend displays `Unknowns` after `Component`.
