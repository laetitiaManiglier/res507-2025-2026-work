**Step 2:**

1. Map the current architecture (Cartographie)
Où se situe l'isolation ? L'isolation se fait au niveau du Pod. Chaque Pod utilise des namespaces Linux et des Cgroups pour isoler ses processus, son réseau (IP propre) et ses ressources des autres Pods.

Qu'est-ce qui redémarre automatiquement ? Les conteneurs (si le processus interne plante) et les Pods (si le Deployment détecte qu'un Pod a disparu).

Qu'est-ce que Kubernetes ne gère pas ? L'infrastructure physique (le serveur lui-même), la persistance des données par défaut (sans volume externe), et la correction des bugs dans le code de l'application.

**Step 3:**

Quand préférer une VM ? Pour faire tourner des applications nécessitant un OS spécifique ou pour une isolation de sécurité maximale.

Quand combiner les deux ? C'est le standard du Cloud : on déploie Kubernetes sur des VMs pour profiter de la flexibilité des conteneurs tout en gardant la gestion d'infrastructure des VMs.


**Step 4:**

Qu'est-ce qui change quand on scale ? Le nombre de Pods actifs. Le Service répartit maintenant la charge (Load Balancing) entre les 3 répliques. L'identité (nom/IP) du Pod qui traite la requête change d'un rafraîchissement à l'autre.

Qu'est-ce qui ne change pas ? Le contenu de la base de données. Les 3 pods partagent la même base PostgreSQL, garantissant que les données affichées restent les mêmes.



**Step 5:**

WQui a recréé le pod ? Le ReplicaSet (via le Deployment quote-app).

Pourquoi ? Pour maintenir l'"état désiré" (3 répliques). Kubernetes observe un écart entre le nombre de pods prévus et réels et corrige la situation (Self-healing).

Si le nœud entier échouait ? Le Scheduler détecterait que le nœud est NotReady. Après un délai, il recréerait les 3 pods sur un autre nœud sain du cluster.

**Step 6:**


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
- Readiness assure le "Zero Dow"



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
 
**Step 9**

**Optional Lane: Multi-node simulation (Simulation multi-nœuds)**

How pods are distributed (Comment les pods sont répartis) :
Dans un cluster multi-nœuds, Kubernetes répartit les pods sur les nœuds de travail disponibles pour équilibrer la charge et assurer une haute disponibilité. Le composant `kube-scheduler` est responsable de cette répartition. Dans notre configuration Colima actuelle, il n'y a qu'un seul nœud (`colima`), donc tous les pods y sont planifiés.

How Kubernetes chooses nodes (Comment Kubernetes choisit les nœuds) :
Le `kube-scheduler` sélectionne les nœuds en fonction d'un processus en deux étapes :
1.  **Filtrage (Predicates) :** Il exclut les nœuds qui ne peuvent pas exécuter le pod (ex: le nœud manque de ressources CPU/mémoire suffisantes telles que définies par les `requests` du pod, le nœud ne correspond pas aux règles de `nodeSelector` ou d'`affinity`, ou le nœud a des tolérances ("taints") que le pod ne supporte pas).
2.  **Évaluation (Priorities) :** Il classe les nœuds éligibles restants en fonction de divers facteurs (ex: quel nœud aura l'utilisation des ressources la plus équilibrée après la planification, si l'image est déjà téléchargée sur le nœud). Le nœud ayant le score le plus élevé est choisi.

What happens when a node becomes unavailable (Que se passe-t-il lorsqu'un nœud devient indisponible) :
Si un nœud plante ou perd sa connectivité réseau, le plan de contrôle (spécifiquement le `node-controller`) détecte que le nœud est `NotReady`. Après un délai d'attente (généralement 5 minutes), les pods sur ce nœud sont marqués pour suppression. Les contrôleurs ReplicaSet et Deployment observent que le nombre de répliques en cours d'exécution a chuté en dessous de l'état souhaité et créent de nouveaux pods, que le planificateur assigne ensuite aux nœuds sains restants.

---

### Step 10 — Rolling Update

What changed in the cluster during the rollout? (Qu'est-ce qui a changé dans le cluster durant le rollout ?)

Un nouveau ReplicaSet a été créé pour la nouvelle version de l'image (`quote-app:v2`). Kubernetes a progressivement créé de nouveaux pods avec la nouvelle image, tout en supprimant les anciens pods (ceux de `quote-app:v1`). Les IPs et les noms des pods ont changé. L'historique de révision du Deployment a été mis à jour (révisions 21 et 22 correspondent aux rollouts v1 et v2).

What stayed the same? (Qu'est-ce qui n'a pas changé ?)

Le Service Kubernetes (`quote-app`) est resté le même : son adresse ClusterIP et sa configuration n'ont pas bougé. Le nombre de répliques (3) est resté constant. Les données dans la base PostgreSQL n'ont pas été affectées. L'application est restée accessible tout au long du rollout (Zero Downtime) grâce à la stratégie `RollingUpdate`.

How did Kubernetes decide when to create and delete Pods? (Comment Kubernetes a-t-il décidé quand créer et supprimer les Pods ?)

Kubernetes utilise la stratégie `RollingUpdate` (configurée dans le Deployment). Par défaut, elle respecte deux paramètres :
- `maxSurge: 1` — Kubernetes peut créer au maximum 1 pod en plus du nombre désiré (donc 4 pods temporairement pendant la transition).
- `maxUnavailable: 1` — Kubernetes s'assure qu'au moins 2 pods restent disponibles à tout moment.

À chaque étape, Kubernetes crée un nouveau pod, attend que sa `readinessProbe` passe à `Ready`, puis supprime un ancien pod. Ce cycle se répète jusqu'à ce que tous les pods soient à la nouvelle version.
---

### Production Architecture Design

Pour passer cette architecture en production, voici les composants clés recommandés :
1. **Ingress Controller (Load Balancer public) :** Un véritable Load Balancer (ex: AWS ALB) pour gérer le trafic HTTPS entrant (Terminaison TLS) avant de le router vers le `quote-app`.
2. **Multi-Node Cluster :** Des nœuds Kubernetes (workers) répartis sur au moins 3 zones de disponibilité (AZ) pour assurer la résilience si un datacenter tombe.
3. **Managed Database :** Externaliser la base de données hors du cluster Kubernetes vers un service managé (ex: Amazon RDS, Google Cloud SQL, Azure Database for PostgreSQL) pour faciliter les sauvegardes, la haute disponibilité (Multi-AZ), et réduire la complexité de gestion du stockage.
4. **Monitoring & Logging :** Intégrer des outils comme Prometheus/Grafana pour les métriques, et Fluentd/Elasticsearch pour centraliser les logs des conteneurs.

**Production Diagram :**


### Controlled Failure Analysis (Épreuve de panne contrôlée)

**Scénario de panne :** Nom d'image Docker invalide
1. **Action :** Modification du fichier `deployment.yaml` pour configurer l'image du conteneur avec un tag inexistant (`image: quote-app:invalid`).
2. **Application :** Exécution de `kubectl apply -f deployment.yaml`.
3. **Observation :**
   - Le statut du nouveau Pod est passé en `ErrImagePull` puis `ImagePullBackOff`.
   - La commande `kubectl get events` a affiché le message suivant : 
     `Failed to pull image "quote-app:invalid": Error response from daemon: pull access denied for quote-app, repository does not exist...`
   - Le `readinessProbe` du nouveau pod a échoué (étant donné qu'il ne démarrait pas).
   - *Comportement de Kubernetes :* Grâce au `RollingUpdate`, l'ancien ReplicaSet n'a pas été supprimé tant que le nouveau n'était pas sain. L'application est restée disponible ("Zero Downtime").
4. **Correction :** Restauration de l'image valide (`image: quote-app:local`) dans le *manifest* et ré-application. Le contrôleur a alors pu télécharger la bonne image et terminer le déploiement sainement.

---

### Broken Rollout — Post-mortem (Analyse de la panne)

**Scénario :** `kubectl set image deployment/quote-app quote-app=quote-app:v99` (tag inexistant)

What failed first? (Qu'est-ce qui a échoué en premier ?)

Le tirage de l'image Docker (`Image Pull`) a échoué en premier, avant même que le conteneur n'essaie de démarrer. Le kubelet du nœud a tenté de télécharger l'image `quote-app:v99` depuis le registre Docker, mais le registre a répondu "pull access denied / repository does not exist". Le pod est instantanément passé à l'état `ErrImagePull` puis `ImagePullBackOff`.

Which signal showed you the failure fastest? (Quel signal a montré la panne le plus vite ?)

Le signal le plus rapide a été `kubectl get pods` : en moins de 30 secondes, le nouveau pod affichait `ImagePullBackOff` dans la colonne STATUS. La commande `kubectl get events` a confirmé l'erreur avec le message précis :
`Failed to pull image "quote-app:v99": Error response from daemon: pull access denied`

What would you check next if this happened in production? (Que vérifierait-on ensuite si cela arrivait en production ?)

1. **Vérifier le tag de l'image** : s'assurer que l'image et le tag existent bien dans le registre (`docker images` ou l'interface du registre).
2. **Vérifier les identifiants** : si le registre est privé, s'assurer que le Secret `imagePullSecrets` est correctement configuré dans le Deployment.
3. **Rollback immédiat** : exécuter `kubectl rollout undo deployment/quote-app` pour restaurer la version stable sans interruption de service.
4. **Alertes** : en production, un outil de monitoring (Prometheus + Alertmanager) aurait déclenché une alerte sur le nombre de pods `Ready` inférieur au compte désiré, avant même qu'un humain ne le remarque.

---

### Rollback Analysis (Analyse du Rollback)

What did rollback change? (Qu'est-ce que le rollback a changé ?)

Le rollback a réactivé le ReplicaSet de la révision précédente (v2). Kubernetes a remplacé les pods tentant de démarrer avec l'image invalide (`v99`) par de nouveaux pods utilisant l'image fonctionnelle (`quote-app:v2`). Les noms des pods et leurs IPs ont changé. Le numéro de révision du Deployment a été incrémenté (une révision de rollback est créée, elle ne revient pas simplement à la révision précédente).

What did rollback not change? (Qu'est-ce que le rollback n'a pas changé ?)

Le Service Kubernetes (`quote-app`) n'a pas été modifié : il continuait de router le trafic sans interruption. Les données dans la base PostgreSQL sont restées intactes. Les fichiers `deployment.yaml` sur le disque local n'ont **pas** été mis à jour automatiquement — il faut le faire manuellement pour garder le manifest en sync avec l'état réel du cluster. Les Secrets et ConfigMaps n'ont pas été affectés.

---

### RollingUpdate Strategy Parameters

What does maxSurge do? (À quoi sert maxSurge ?)

`maxSurge` définit le nombre **maximum de pods supplémentaires** qui peuvent être créés au-delà du nombre de répliques désiré pendant un rollout. Avec `maxSurge: 1` et 3 répliques désirées, Kubernetes peut créer jusqu'à 4 pods simultanément pendant la transition. Cela accélère le déploiement car un nouveau pod peut démarrer avant qu'un ancien soit supprimé.

What does maxUnavailable do? (À quoi sert maxUnavailable ?)

`maxUnavailable` définit le nombre **maximum de pods qui peuvent être indisponibles** (non Ready) pendant un rollout. Avec `maxUnavailable: 1`, Kubernetes peut supprimer un ancien pod avant que son remplaçant soit prêt. Avec `maxUnavailable: 0`, aucun pod ne sera supprimé avant que son remplaçant soit totalement opérationnel.

Why might you choose 0 for maxUnavailable? (Pourquoi choisir 0 pour maxUnavailable ?)

Choisir `maxUnavailable: 0` garantit un **Zero Downtime** absolu pendant les déploiements : à tout moment, les 3 pods sont en état `Ready` et reçoivent du trafic. C'est essentiel pour les applications en production où la moindre interruption est inacceptable. La contrepartie est que le rollout consomme temporairement plus de ressources (`maxSurge: 1` crée un pod supplémentaire), et est légèrement plus lent.
