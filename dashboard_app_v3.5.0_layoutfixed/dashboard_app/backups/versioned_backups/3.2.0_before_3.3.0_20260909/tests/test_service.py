import pytest
from backend.services.dashboard_service import process_directory
def test_missing_folder():
 with pytest.raises(ValueError):process_directory('Z:/folder/that/does/not/exist')
