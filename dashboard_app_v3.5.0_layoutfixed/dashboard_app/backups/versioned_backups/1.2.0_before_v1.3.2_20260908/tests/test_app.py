from app import create_app
def test_endpoints():
 c=create_app({'TESTING':True}).test_client();assert c.get('/').status_code==200;assert c.get('/api/health').json['version']=='1.1.0';assert 'default_source_directory' in c.get('/api/settings').json
