from backend.validators.values import clean_numeric_value,normalize_header
def test_values():
 assert clean_numeric_value('1.2')==1.2 and clean_numeric_value('--') is None
 assert normalize_header('Paraffins')=='Paraffin'
