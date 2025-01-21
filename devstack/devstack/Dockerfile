#FROM ubuntu:20.04
FROM ubuntu:22.04
#FROM ubuntu:jammy-20240627.1

EXPOSE 80 5000 8773 8774 8775 8776 9292
ENV DEBIAN_FRONTEND="noninteractive"
ARG DEVSTACK_VERSION
ENV DEVSTACK_VERSION=${DEVSTACK_VERSION}
ARG PUBLIC_IP
ENV PUBLIC_IP=${PUBLIC_IP}

# theses are also set in /etc/profile and the post-build script
# but we need it here to run the devstack the network services like
# openstack network agent list
# devstack@q-dhcp.service
# devstack@q-l3.service.
# devstack@q-meta.service
ENV OS_REGION_NAME=RegionOne
ENV OS_PROJECT_DOMAIN_ID=default
ENV OS_CACERT=
ENV OS_AUTH_URL=http://172.28.0.2/identity
ENV OS_TENANT_NAME=admin
ENV OS_USER_DOMAIN_ID=default
ENV OS_USERNAME=admin
ENV OS_VOLUME_API_VERSION=3
ENV OS_AUTH_TYPE=password
ENV OS_PROJECT_NAME=admin
ENV OS_PASSWORD=password
ENV OS_IDENTITY_API_VERSION=3

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  ca-certificates \
  patch \
  systemd \
  sudo \
  iproute2 \
  lsb \
  git \
  curl \
  init \
  ebtables \
  iptables \
  jq \
  vim \
  openvswitch-switch \
  python3-novaclient \
  && apt-get -y clean \
  && rm -rf /var/lib/apt/lists/* \
  && curl https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh > /bin/wait-for-it.sh \
  && chmod a+x /bin/wait-for-it.sh \
  && useradd -s /bin/bash -d /opt/stack -m stack \
  && mkdir -p /etc/sudoers.d/ \
  && echo "stack ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/stack \
  # https://review.opendev.org/c/openstack/devstack/+/838645 \
  && chmod +x /opt/stack \
  && systemctl enable openvswitch-switch.service

WORKDIR /opt/stack
RUN git clone https://github.com/openstack/devstack.git \
  && git -C ./devstack checkout ${DEVSTACK_VERSION}

COPY devstack/local.conf /opt/stack/devstack/
RUN chown -R stack:stack ./devstack

COPY devstack/setup-devstack.service /etc/systemd/system/
COPY devstack/iscsid.service /etc/systemd/system/
COPY devstack/bin/test-devstack /bin/
COPY devstack/bin/post-build /bin/
COPY devstack/bin/set-endpoint /bin/
RUN chmod 755 /bin/test-devstack /bin/post-build /bin/set-endpoint

# this is only to run the setup in the first run
# it will be disabled after the first run
RUN systemctl enable setup-devstack.service

STOPSIGNAL SIGRTMIN+3
CMD [ "/sbin/init" ]
