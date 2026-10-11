"""Tests the shipped database with standard-library SQLite, no ML dependencies."""
import hashlib
import json
import sqlite3
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'src-tauri/resources/data/genefield-reference.sqlite'
class ReferenceTests(unittest.TestCase):
    def setUp(self): self.db=sqlite3.connect(f'{PATH.as_uri()}?mode=ro',uri=True)
    def tearDown(self): self.db.close()
    def test_schema_counts_and_unique_ids(self):
        expected=json.loads((ROOT/'docs/evidence/reference-validation.json').read_text())
        self.assertEqual(hashlib.sha256(PATH.read_bytes()).hexdigest(),expected['database_sha256'])
        self.assertEqual(self.db.execute('PRAGMA integrity_check').fetchone()[0],'ok')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM lines').fetchone()[0],20628)
        self.assertEqual(self.db.execute('SELECT COUNT(DISTINCT line_id) FROM lines').fetchone()[0],20628)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM line_trait_summary').fetchone()[0],77788)
        self.assertFalse(self.db.execute('PRAGMA foreign_key_check').fetchall())
    def test_search_and_known_profile(self):
        ids=[r[0] for r in self.db.execute('SELECT line_id FROM lines WHERE line_id LIKE ? ORDER BY line_id',('%GID_10039%',))]
        self.assertEqual(ids,['GID_10039'])
        traits=self.db.execute('SELECT trait,mean_value,observation_count,units FROM line_trait_summary WHERE line_id=?',('GID_10039',)).fetchall()
        self.assertEqual({r[0] for r in traits},{'GY','DTF','NO','LB'})
        for trait,value,count,units in traits:
            if value is None: self.assertEqual(count,0)
            else: self.assertGreater(count,0)
            self.assertEqual(units,{'GY':'kg/ha','DTF':'days','NO':'modified SES IRRI rating points','LB':'SES IRRI rating points'}[trait])
    def test_known_pedigree_and_children(self):
        self.assertEqual(self.db.execute('SELECT parent_1,parent_2 FROM pedigree WHERE line_id=?',('GID_1',)).fetchone(),('GID_2980','GID_2052'))
        children=[r[0] for r in self.db.execute('SELECT line_id FROM pedigree WHERE parent_1=? OR parent_2=?',('GID_2980','GID_2980'))]
        self.assertIn('GID_1',children)
    def test_missing_values_are_null_and_read_only(self):
        self.assertGreater(self.db.execute('SELECT COUNT(*) FROM line_trait_summary WHERE mean_value IS NULL').fetchone()[0],0)
        with self.assertRaises(sqlite3.OperationalError): self.db.execute("INSERT INTO lines(line_id,has_genotype,observation_count) VALUES ('FAKE',0,0)")
if __name__=='__main__': unittest.main()
