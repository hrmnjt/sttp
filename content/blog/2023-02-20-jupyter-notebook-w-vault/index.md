+++
title = "Using Vault to manage secrets in a Jupyter Notebook"
date = 2023-02-20
+++

At work we use Hashicorp Vault [^1] to manage secrets on Kubernetes in
application deployment pipelines. Secrets are defined on Vault and are 
substituted into IaC[^2] during GitOps flow. Despite such sophistication on 
application deployment lifecyle, general development workflow doesn't is 
generally created without such secret management solution. There are many 
issues that we've observed (especially when working with databases)



https://developer.hashicorp.com/vault/docs/get-started/developer-qs


```bash
cd content/blog/2023-02-20-jupyter-notebook-w-vault

python3 -m venv .venv
source .venv/bin/activate
pip install hvac

touch secrets.py
```

Check [python](./set_secrets.py)

# TODO: Build the narrative


[^1]: https://www.vaultproject.io

[^2]: IaC abbr. to Infrastructure as Code. Terraform and Terragrunt is used 
together to document Infrastructure which transforms to physical infrastructure
during deployment process.
