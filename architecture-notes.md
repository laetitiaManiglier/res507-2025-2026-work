Step 2:

1. Map the current architecture (Cartographie)
Où se situe l'isolation ? L'isolation se fait au niveau du Pod. Chaque Pod utilise des namespaces Linux et des Cgroups pour isoler ses processus, son réseau (IP propre) et ses ressources des autres Pods.

Qu'est-ce qui redémarre automatiquement ? Les conteneurs (si le processus interne plante) et les Pods (si le Deployment détecte qu'un Pod a disparu).

Qu'est-ce que Kubernetes ne gère pas ? L'infrastructure physique (le serveur lui-même), la persistance des données par défaut (sans volume externe), et la correction des bugs dans le code de l'application.

Step 3:

Quand préférer une VM ? Pour faire tourner des applications nécessitant un OS spécifique ou pour une isolation de sécurité maximale.

Quand combiner les deux ? C'est le standard du Cloud : on déploie Kubernetes sur des VMs pour profiter de la flexibilité des conteneurs tout en gardant la gestion d'infrastructure des VMs.


Step 4: 
Qu'est-ce qui change quand on scale ? Le nombre de Pods actifs. Le Service répartit maintenant la charge (Load Balancing) entre les 3 répliques. L'identité (nom/IP) du Pod qui traite la requête change d'un rafraîchissement à l'autre.

Qu'est-ce qui ne change pas ? Le contenu de la base de données. Les 3 pods partagent la même base PostgreSQL, garantissant que les données affichées restent les mêmes.



**Step 5:**

WQui a recréé le pod ? Le ReplicaSet (via le Deployment quote-app).

Pourquoi ? Pour maintenir l'"état désiré" (3 répliques). Kubernetes observe un écart entre le nombre de pods prévus et réels et corrige la situation (Self-healing).

Si le nœud entier échouait ? Le Scheduler détecterait que le nœud est NotReady. Après un délai, il recréerait les 3 pods sur un autre nœud sain du cluster.

Step 6:


What are requests vs limits?

Requests : C'est la quantité minimale de ressources qu'un pod demande. Kubernetes utilise cette valeur pour planifier le pod sur un nœud.

Limits : C'est la quantité maximale de ressources qu'un pod peut utiliser. Si un pod dépasse sa limite, il sera tué.

Why are they important in multi-tenant systems?

Car sans requests et limits, un pod pourrait monopoliser toutes les ressources du nœud, empêchant les autres pods de fonctionner. C'est une question de stabilité et d'équité.


**Step 7:**

What is the difference between readiness and liveness? Différence

- Liveness Probe : Vérifie si l'application est en cours d'exécution. Si elle échoue (ex: deadlock, crash), Kubernetes redémarre le conteneur.
- Readiness Probe : Vérifie si l'application est prête à recevoir du trafic (ex: connexion BDD établie, cache chargé). Si elle échoue, Kubernetes arrête d'envoyer du trafic à ce pod (le retire du Load Balancer), mais ne le redémarre pas.

Why does this matter in production? Importance en production

- Liveness assure l'auto-guérison (self-healing) en cas de bug fatal.
- Readiness assure le "Zero Dow



**Connect Kubernetes**

Sous k3s : Généralement une Machine Virtuelle Linux légère (sur Colima/Docker Desktop) ou directement sur l'OS du serveur (Bare Metal).

Remplacement ? Non. La virtualisation abstrait le matériel (Hardware), alors que Kubernetes abstrait l'OS pour l'application. Ils sont complémentaires.

Dans le Cloud : Ce sont des VMs (ex: instances EC2 sur AWS) qui hébergent physiquement les nœuds Kubernetes.


**Explain how this stack might look in:**

Stack selon l'environnement :

Cloud Data Center : VM (Nœud) → K8s → Pods. Ressources élastiques et base de données managée.

Système Automobile (Edge) : Matériel ARM → Linux léger → k3s → Pods. Pas de virtualisation (Bare Metal) pour la performance.

Institution Financière : Serveur → Hyperviseur → VMs isolées → K8s → Pods. Isolation réseau stricte et chiffrement total.

**Step 8:**
 
Why is this better than plain-text configuration?
 
- **Sécurité** : Les secrets ne sont pas stockés en clair dans les fichiers de configuration (comme `deployment.yaml`). Cela évite de commiter des mots de passe dans Git.
- **Séparation des préoccupations** : Les développeurs peuvent référencer des secrets sans connaître leurs valeurs réelles (gérées par les Ops/Admins).
- **Contrôle d'accès** : On peut restreindre qui a le droit de lire les Secrets via RBAC (Role-Based Access Control), alors que tout le monde peut lire le dépôt Git.
 
Is a Secret encrypted by default? Where?
 
- **Non**, par défaut, les Secrets sont seulement encodés en **Base64** dans l'API Kubernetes. Si on a accès à l'API ou à etcd, on peut les décoder très facilement (`echo ... | base64 -d`).
- **Où ?** : Ils sont stockés dans la base de données de Kubernetes, **etcd**.
- **Chiffrement** : Pour qu'ils soient chiffrés, l'administrateur du cluster doit activer *Encryption at Rest* (chiffrement au repos) dans la configuration de l'API Server, ce qui chiffrera les données avant de les écrire dans etcd.
 
Step 9
**Optional Lane: Multi-node simulation (Simulation multi-nœuds)**

How pods are distributed (Comment les pods sont répartis) :
Dans un cluster multi-nœuds, Kubernetes répartit les pods sur les nœuds de travail disponibles pour équilibrer la charge et assurer une haute disponibilité. Le composant `kube-scheduler` est responsable de cette répartition. Dans notre configuration Colima actuelle, il n'y a qu'un seul nœud (`colima`), donc tous les pods y sont planifiés.

How Kubernetes chooses nodes (Comment Kubernetes choisit les nœuds) :
Le `kube-scheduler` sélectionne les nœuds en fonction d'un processus en deux étapes :
1.  **Filtrage (Predicates) :** Il exclut les nœuds qui ne peuvent pas exécuter le pod (ex: le nœud manque de ressources CPU/mémoire suffisantes telles que définies par les `requests` du pod, le nœud ne correspond pas aux règles de `nodeSelector` ou d'`affinity`, ou le nœud a des tolérances ("taints") que le pod ne supporte pas).
2.  **Évaluation (Priorities) :** Il classe les nœuds éligibles restants en fonction de divers facteurs (ex: quel nœud aura l'utilisation des ressources la plus équilibrée après la planification, si l'image est déjà téléchargée sur le nœud). Le nœud ayant le score le plus élevé est choisi.

What happens when a node becomes unavailable (Que se passe-t-il lorsqu'un nœud devient indisponible) :
Si un nœud plante ou perd sa connectivité réseau, le plan de contrôle (spécifiquement le `node-controller`) détecte que le nœud est `NotReady`. Après un délai d'attente (généralement 5 minutes), les pods sur ce nœud sont marqués pour suppression. Les contrôleurs ReplicaSet et Deployment observent que le nombre de répliques en cours d'exécution a chuté en dessous de l'état souhaité et créent de nouveaux pods, que le planificateur assigne ensuite aux nœuds sains restants.
