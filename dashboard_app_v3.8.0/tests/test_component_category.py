import pandas as pd
from backend.calculations.component_category import build_component_category
def test_revised_logic():
 d=pd.DataFrame([{'COMPONENT':'Methane','%WGT':1,'CARBON#':1},{'COMPONENT':'Ethane','%WGT':2,'CARBON#':2},{'COMPONENT':'Propane','%WGT':3,'CARBON#':3},{'COMPONENT':'Unidentified','%WGT':4,'CARBON#':4},{'COMPONENT':'Pentane','%WGT':5,'CARBON#':5}]); assert build_component_category(d)=={'C3 & Below':3.0,'Propane':3.0,'C3-C5':4.0,'Pentane':5.0}
