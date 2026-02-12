**Step 4:**  

What changes when you scale?

Le pod qui traite la requete qui change car Kubernetes répartit la charge (Load Balancing) entre les 3 répliques.

What does not change?

Le contenu de la base de données. Les 3 pods partagent la même base de données PostgreSQL.

**Step 5:**

Who recreated the pod?

Le ReplicaSet (composant géré par le Deployment). Dans ce cas précis, c'est `quote-app-6bb8fffd99`.

Why?

Pour maintenir l'état désiré défini dans le déploiement : `replicas: 3`. 
Kubernetes observe qu'il manque un pod (2 sont "Running" alors qu'il en faut 3), donc il en crée un nouveau pour compenser la perte. C'est le principe de l'auto-guérison (self-healing).

What would happen if the node itself failed?

Si le nœud entier échoue (devient `NotReady`), Kubernetes (le Scheduler) détectera l'absence de réponse. Après un délai, il marquera les pods sur ce nœud comme perdus. Le ReplicaSet verra alors que le nombre de pods sains a chuté et en demandera de nouveaux. Le Scheduler placera ces nouveaux pods sur les autres nœuds sains du cluster.


**Step 6:**

What are requests vs limits?

Requests : C'est la quantité minimale de ressources qu'un pod demande. Kubernetes utilise cette valeur pour planifier le pod sur un nœud.

Limits : C'est la quantité maximale de ressources qu'un pod peut utiliser. Si un pod dépasse sa limite, il sera tué.

Why are they important in multi-tenant systems?

Car sans requests et limits, un pod pourrait monopoliser toutes les ressources du nœud, empêchant les autres pods de fonctionner. C'est une question de stabilité et d'équité.


**Step 7:**

What is the difference between readiness and liveness?

- Liveness Probe : Vérifie si l'application est en cours d'exécution. Si elle échoue (ex: deadlock, crash), Kubernetes redémarre le conteneur.
- Readiness Probe : Vérifie si l'application est prête à recevoir du trafic (ex: connexion BDD établie, cache chargé). Si elle échoue, Kubernetes arrête d'envoyer du trafic à ce pod (le retire du Load Balancer), mais ne le redémarre pas.

Why does this matter in production?

- Liveness assure l'auto-guérison (self-healing) en cas de bug fatal.
- Readiness assure le "Zero Downtime" : on n'envoie pas de clients sur un pod qui n'a pas fini de démarrer ou qui est temporairement surchargé.

**Connect Kubernetes**

What runs underneath your k3s cluster?

Tout dépend de votre installation, mais généralement :
-   Local (Colima/Docker Desktop): k3s tourne à l'intérieur d'une Machine Virtuelle Linux (hébergée par QEMU/HyperKit sur Mac).
-   Bare Metal : Il tournerait directement sur l'OS du serveur (Linux).

Is Kubernetes replacing virtualization?

Non, ils sont complémentaires.
-   Virtualisation (VMs) : Abstraction du matériel (Hardware). Offre une isolation forte (OS complet).
-   Kubernetes (Conteneurs) : Abstraction de l'OS. Offre une densité et une agilité supérieures.
Souvent, on fait tourner Kubernetes SUR des VMs (ex: EC2, Azure VMs).

In a cloud provider, what actually hosts your nodes?

Ce sont des Machines Virtuelles (EC2 sur AWS, VM sur Azure/GCP) qui sont elles-mêmes hébergées sur des serveurs physiques gérés par le fournisseur cloud. Kubernetes (EKS/AKS/GKE) gère ces VMs pour vous.
**Explain how this stack might look in:**

A cloud data center

Tout est géré ("Managed").
-   **Kubernetes** : EKS (AWS), AKS (Azure), GKE (Google). Plus de gestion des masters.
-   **Base de données** : RDS ou Aurora (PostgreSQL managé). Pas de StatefulSet à gérer soi-même.
-   **Stockage** : EBS/S3.
-   **Avantage** : Scalabilité infinie, pas de maintenance matérielle.

An embedded automotive system

Tout est contraint et "Edge".
-   **Kubernetes** : k3s ou MicroK8s (très léger).
-   **Base de données** : SQLite ou une version allégée de Postgres, souvent stockée sur mémoire flash robuste.
-   **Contraintes** : Pas de cloud permanent, ressources (CPU/RAM) limitées, redémarrage instantané requis.
-   **Architecture** : "Air-gapped" (pas d'internet), mises à jour via OTA (Over The Air) par lots.

A financial institution

Tout est question de Sécurité et Compliance.
-   **Kubernetes** : OpenShift ou versions "Hardened" de K8s, souvent sur des serveurs privés (On-Premise) ou Cloud Privé.
-   **Réseau** : Isolation totale (NetworkPolicies strictes), chiffrement de tout le trafic (mTLS avec Istio/Linkerd).
-   **Base de données** : Clusters Postgres haute dispo (Patroni) avec chiffrement au repos et en transit.
-   **Process** : Audit logs partout, pas d'accès root, scan de vulnérabilités obligatoire.


**Step 8:**

...

Step 9

