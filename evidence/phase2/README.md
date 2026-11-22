# Phase 2 Evidence Directory (Person-Wise Index)

Organized per team member so any evaluator can locate Phase 2 proof in under 30 seconds:

| Folder | Team Member | Extensions Covered | Files |
| :--- | :--- | :--- | :--- |
| **`personA/`** | **Pankaj Baid** (Mac 1) | Ext B (30s TTL & flush), Ext A/E (DNS cutover) | `extB_dns_ttl_record_change_local.txt` *(plus `extABE_local_sudo_port53.txt` when sudo script runs)* |
| **`personB/`** | **Ashutosh Singh** (Mac 2) | Ext D (HA backend failover & recovery + nginx error log) | `extD_ha_failover_local.txt` |
| **`personC/`** | **Shreya Suman** (Mac 3) | Ext E (Standby Edge `X-Edge: Standby-Mac3`), Ext C (`pf` isolation) | `extE_standby_edge_local.txt` *(plus `extC_local_pf_isolation.txt` when sudo script runs)* |
| **`personD/`** | **Ranvendra Pratap Singh** (Mac 4) | Ext A (Backup DNS failover), Ext F (5-layer diagnostic baseline) | `extA_backup_dns_local.txt`, `extF_layer_diagnostic_baseline.txt` |

To regenerate the non-sudo local evidence:
```bash
./phase2/scripts/run_local_no_sudo_tests.sh
```

To also generate the privileged `pfctl` + port-`53` OS cache evidence on one Mac:
```bash
sudo ./phase2/scripts/run_local_sudo_full_demo.sh
```
