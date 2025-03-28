import { serverResponseSchema } from "./models"
import { describe, expect, test } from "vitest"

const examplev2m1 = {
  servers: [
    {
      accessIPv4: "1.2.3.4",
      accessIPv6: "80fe::",
      addresses: {
        private: [
          {
            addr: "192.168.1.30",
            "OS-EXT-IPS-MAC:mac_addr": "00:0c:29:0d:11:74",
            "OS-EXT-IPS:type": "fixed",
            version: 4,
          },
        ],
      },
      created: "2013-09-03T04:01:32Z",
      description: "",
      flavor: {
        disk: 1,
        ephemeral: 0,
        extra_specs: {},
        original_name: "m1.tiny",
        ram: 512,
        swap: 0,
        vcpus: 1,
      },
      hostId: "bcf92836fc9ed4203a75cb0337afc7f917d2be504164b995c2334b25",
      id: "f5dc173b-6804-445a-a6d8-c705dad5b5eb",
      image: {
        id: "70a599e0-31e7-49b7-b260-868f441e862b",
        links: [
          {
            href: "http://openstack.example.com/6f70656e737461636b20342065766572/images/70a599e0-31e7-49b7-b260-868f441e862b",
            rel: "bookmark",
          },
        ],
        properties: {
          architecture: "x86_64",
          auto_disk_config: "True",
          base_image_ref: "70a599e0-31e7-49b7-b260-868f441e862b",
          container_format: "ova",
          disk_format: "vhd",
          kernel_id: "nokernel",
          min_disk: "1",
          min_ram: "0",
          ramdisk_id: "nokernel",
        },
      },
      key_name: null,
      links: [
        {
          href: "http://openstack.example.com/v2/6f70656e737461636b20342065766572/servers/f5dc173b-6804-445a-a6d8-c705dad5b5eb",
          rel: "self",
        },
        {
          href: "http://openstack.example.com/6f70656e737461636b20342065766572/servers/f5dc173b-6804-445a-a6d8-c705dad5b5eb",
          rel: "bookmark",
        },
      ],
      metadata: {
        "My Server Name": "Apache1",
      },
      name: "new-server-test",
      config_drive: "",
      locked: false,
      locked_reason: "",
      "OS-DCF:diskConfig": "AUTO",
      "OS-EXT-AZ:availability_zone": "us-west",
      "OS-EXT-SRV-ATTR:hostname": "new-server-test",
      "OS-EXT-STS:power_state": 1,
      "OS-EXT-STS:task_state": null,
      "OS-EXT-STS:vm_state": "active",
      "os-extended-volumes:volumes_attached": [
        { id: "volume_id1", delete_on_termination: false },
        { id: "volume_id2", delete_on_termination: false },
      ],
      "OS-SRV-USG:launched_at": "2013-09-23T13:53:12.774549",
      "OS-SRV-USG:terminated_at": null,
      pinned_availability_zone: "us-west",
      progress: 0,
      scheduler_hints: {
        same_host: ["48e6a9f6-30af-47e0-bc04-acaed113bb4e"],
      },
      security_groups: [
        {
          name: "default",
        },
      ],
      status: "ACTIVE",
      tags: [],
      tenant_id: "6f70656e737461636b20342065766572",
      trusted_image_certificates: null,
      updated: "2013-09-03T04:01:32Z",
      user_id: "fake",
    },
  ],
  servers_links: [
    {
      href: "http://openstack.example.com/v2.1/6f70656e737461636b20342065766572/servers/detail?limit=1&marker=f5dc173b-6804-445a-a6d8-c705dad5b5eb",
      rel: "next",
    },
  ],
}

const examplev2m98 = {
  servers: [
    {
      accessIPv4: "1.2.3.4",
      accessIPv6: "80fe::",
      addresses: {
        private: [
          {
            addr: "192.168.1.30",
            "OS-EXT-IPS-MAC:mac_addr": "00:0c:29:0d:11:74",
            "OS-EXT-IPS:type": "fixed",
            version: 4,
          },
        ],
      },
      created: "2013-09-03T04:01:32Z",
      description: "",
      flavor: {
        disk: 1,
        ephemeral: 0,
        extra_specs: {},
        original_name: "m1.tiny",
        ram: 512,
        swap: 0,
        vcpus: 1,
      },
      hostId: "bcf92836fc9ed4203a75cb0337afc7f917d2be504164b995c2334b25",
      id: "f5dc173b-6804-445a-a6d8-c705dad5b5eb",
      image: {
        id: "70a599e0-31e7-49b7-b260-868f441e862b",
        links: [
          {
            href: "http://openstack.example.com/6f70656e737461636b20342065766572/images/70a599e0-31e7-49b7-b260-868f441e862b",
            rel: "bookmark",
          },
        ],
        properties: {
          architecture: "x86_64",
          auto_disk_config: "True",
          base_image_ref: "70a599e0-31e7-49b7-b260-868f441e862b",
          container_format: "ova",
          disk_format: "vhd",
          kernel_id: "nokernel",
          min_disk: "1",
          min_ram: "0",
          ramdisk_id: "nokernel",
        },
      },
      key_name: null,
      links: [
        {
          href: "http://openstack.example.com/v2/6f70656e737461636b20342065766572/servers/f5dc173b-6804-445a-a6d8-c705dad5b5eb",
          rel: "self",
        },
        {
          href: "http://openstack.example.com/6f70656e737461636b20342065766572/servers/f5dc173b-6804-445a-a6d8-c705dad5b5eb",
          rel: "bookmark",
        },
      ],
      metadata: {
        "My Server Name": "Apache1",
      },
      name: "new-server-test",
      config_drive: "",
      locked: false,
      locked_reason: "",
      "OS-DCF:diskConfig": "AUTO",
      "OS-EXT-AZ:availability_zone": "us-west",
      "OS-EXT-SRV-ATTR:hostname": "new-server-test",
      "OS-EXT-STS:power_state": 1,
      "OS-EXT-STS:task_state": null,
      "OS-EXT-STS:vm_state": "active",
      "os-extended-volumes:volumes_attached": [
        { id: "volume_id1", delete_on_termination: false },
        { id: "volume_id2", delete_on_termination: false },
      ],
      "OS-SRV-USG:launched_at": "2013-09-23T13:53:12.774549",
      "OS-SRV-USG:terminated_at": null,
      pinned_availability_zone: "us-west",
      progress: 0,
      security_groups: [
        {
          name: "default",
        },
      ],
      status: "ACTIVE",
      tags: [],
      tenant_id: "6f70656e737461636b20342065766572",
      trusted_image_certificates: null,
      updated: "2013-09-03T04:01:32Z",
      user_id: "fake",
    },
  ],
  servers_links: [
    {
      href: "http://openstack.example.com/v2.1/6f70656e737461636b20342065766572/servers/detail?limit=1&marker=f5dc173b-6804-445a-a6d8-c705dad5b5eb",
      rel: "next",
    },
  ],
}

const examplev2m96 = {
  servers: [
    {
      accessIPv4: "1.2.3.4",
      accessIPv6: "80fe::",
      addresses: {
        private: [
          {
            addr: "192.168.1.30",
            "OS-EXT-IPS-MAC:mac_addr": "00:0c:29:0d:11:74",
            "OS-EXT-IPS:type": "fixed",
            version: 4,
          },
        ],
      },
      created: "2013-09-03T04:01:32Z",
      description: "",
      flavor: {
        disk: 1,
        ephemeral: 0,
        extra_specs: {},
        original_name: "m1.tiny",
        ram: 512,
        swap: 0,
        vcpus: 1,
      },
      hostId: "bcf92836fc9ed4203a75cb0337afc7f917d2be504164b995c2334b25",
      id: "f5dc173b-6804-445a-a6d8-c705dad5b5eb",
      image: {
        id: "70a599e0-31e7-49b7-b260-868f441e862b",
        links: [
          {
            href: "http://openstack.example.com/6f70656e737461636b20342065766572/images/70a599e0-31e7-49b7-b260-868f441e862b",
            rel: "bookmark",
          },
        ],
      },
      key_name: null,
      links: [
        {
          href: "http://openstack.example.com/v2/6f70656e737461636b20342065766572/servers/f5dc173b-6804-445a-a6d8-c705dad5b5eb",
          rel: "self",
        },
        {
          href: "http://openstack.example.com/6f70656e737461636b20342065766572/servers/f5dc173b-6804-445a-a6d8-c705dad5b5eb",
          rel: "bookmark",
        },
      ],
      metadata: {
        "My Server Name": "Apache1",
      },
      name: "new-server-test",
      config_drive: "",
      locked: false,
      locked_reason: "",
      "OS-DCF:diskConfig": "AUTO",
      "OS-EXT-AZ:availability_zone": "us-west",
      "OS-EXT-SRV-ATTR:hostname": "new-server-test",
      "OS-EXT-STS:power_state": 1,
      "OS-EXT-STS:task_state": null,
      "OS-EXT-STS:vm_state": "active",
      "os-extended-volumes:volumes_attached": [
        { id: "volume_id1", delete_on_termination: false },
        { id: "volume_id2", delete_on_termination: false },
      ],
      "OS-SRV-USG:launched_at": "2013-09-23T13:53:12.774549",
      "OS-SRV-USG:terminated_at": null,
      pinned_availability_zone: "us-west",
      progress: 0,
      security_groups: [
        {
          name: "default",
        },
      ],
      status: "ACTIVE",
      tags: [],
      tenant_id: "6f70656e737461636b20342065766572",
      trusted_image_certificates: null,
      updated: "2013-09-03T04:01:32Z",
      user_id: "fake",
    },
  ],
  servers_links: [
    {
      href: "http://openstack.example.com/v2.1/6f70656e737461636b20342065766572/servers/detail?limit=1&marker=f5dc173b-6804-445a-a6d8-c705dad5b5eb",
      rel: "next",
    },
  ],
}
const examplev2m73 = {
  servers: [
    {
      "OS-DCF:diskConfig": "AUTO",
      "OS-EXT-AZ:availability_zone": "nova",
      "OS-EXT-SRV-ATTR:host": "compute",
      "OS-EXT-SRV-ATTR:hostname": "new-server-test",
      "OS-EXT-SRV-ATTR:hypervisor_hostname": "fake-mini",
      "OS-EXT-SRV-ATTR:instance_name": "instance-00000001",
      "OS-EXT-SRV-ATTR:kernel_id": "",
      "OS-EXT-SRV-ATTR:launch_index": 0,
      "OS-EXT-SRV-ATTR:ramdisk_id": "",
      "OS-EXT-SRV-ATTR:reservation_id": "r-l0i0clt2",
      "OS-EXT-SRV-ATTR:root_device_name": "/dev/sda",
      "OS-EXT-SRV-ATTR:user_data": "IyEvYmluL2Jhc2gKL2Jpbi9zdQplY2hvICJJIGFtIGluIHlvdSEiCg==",
      "OS-EXT-STS:power_state": 1,
      "OS-EXT-STS:task_state": null,
      "OS-EXT-STS:vm_state": "active",
      "OS-SRV-USG:launched_at": "2019-04-23T15:19:15.317839",
      "OS-SRV-USG:terminated_at": null,
      accessIPv4: "1.2.3.4",
      accessIPv6: "80fe::",
      addresses: {
        private: [
          {
            "OS-EXT-IPS-MAC:mac_addr": "00:0c:29:0d:11:74",
            "OS-EXT-IPS:type": "fixed",
            addr: "192.168.1.30",
            version: 4,
          },
        ],
      },
      config_drive: "",
      created: "2019-04-23T15:19:14Z",
      description: null,
      flavor: {
        disk: 1,
        ephemeral: 0,
        extra_specs: {},
        original_name: "m1.tiny",
        ram: 512,
        swap: 0,
        vcpus: 1,
      },
      hostId: "2091634baaccdc4c5a1d57069c833e402921df696b7f970791b12ec6",
      host_status: "UP",
      id: "2ce4c5b3-2866-4972-93ce-77a2ea46a7f9",
      image: {
        id: "70a599e0-31e7-49b7-b260-868f441e862b",
        links: [
          {
            href: "http://openstack.example.com/6f70656e737461636b20342065766572/images/70a599e0-31e7-49b7-b260-868f441e862b",
            rel: "bookmark",
          },
        ],
      },
      key_name: null,
      links: [
        {
          href: "http://openstack.example.com/v2.1/6f70656e737461636b20342065766572/servers/2ce4c5b3-2866-4972-93ce-77a2ea46a7f9",
          rel: "self",
        },
        {
          href: "http://openstack.example.com/6f70656e737461636b20342065766572/servers/2ce4c5b3-2866-4972-93ce-77a2ea46a7f9",
          rel: "bookmark",
        },
      ],
      locked: true,
      locked_reason: "I don't want to work",
      metadata: {
        "My Server Name": "Apache1",
      },
      name: "new-server-test",
      "os-extended-volumes:volumes_attached": [],
      progress: 0,
      security_groups: [
        {
          name: "default",
        },
      ],
      status: "ACTIVE",
      tags: [],
      tenant_id: "6f70656e737461636b20342065766572",
      trusted_image_certificates: null,
      updated: "2019-04-23T15:19:15Z",
      user_id: "admin",
    },
  ],
}

const examplev2m69 = {
  servers: [
    {
      created: "2018-12-03T21:06:18Z",
      id: "b6b0410f-b65f-4473-855e-5d82a71759e0",
      status: "UNKNOWN",
      tenant_id: "6f70656e737461636b20342065766572",
      links: [
        {
          href: "http://openstack.example.com/v2.1/6f70656e737461636b20342065766572/servers/b6b0410f-b65f-4473-855e-5d82a71759e0",
          rel: "self",
        },
        {
          href: "http://openstack.example.com/6f70656e737461636b20342065766572/servers/b6b0410f-b65f-4473-855e-5d82a71759e0",
          rel: "bookmark",
        },
      ],
    },
  ],
}

describe("Project Schema Validation", () => {
  test("server json should pass", () => {
    const result = serverResponseSchema.safeParse(examplev2m1)
    if (!result.success) {
      console.error("Validation failed:", result.error.errors)
    }
    expect(result.success).toBe(true)
  })

  test("server json should pass", () => {
    const result = serverResponseSchema.safeParse(examplev2m98)
    if (!result.success) {
      console.error("Validation failed:", result.error.errors)
    }
    expect(result.success).toBe(true)
  })

  test("server json should pass", () => {
    const result = serverResponseSchema.safeParse(examplev2m96)
    if (!result.success) {
      console.error("Validation failed:", result.error.errors)
    }
    expect(result.success).toBe(true)
  })

  test("server json should pass", () => {
    const result = serverResponseSchema.safeParse(examplev2m73)
    if (!result.success) {
      console.error("Validation failed:", result.error.errors)
    }
    expect(result.success).toBe(true)
  })

  test("server json should pass", () => {
    const result = serverResponseSchema.safeParse(examplev2m69)
    if (!result.success) {
      console.error("Validation failed:", result.error.errors)
    }
    expect(result.success).toBe(true)
  })

  test("server missing required fields should fail", () => {
    const result = serverResponseSchema.safeParse({ servers: [{ name: "Missing ID" }] })
    expect(result.success).toBe(false)
  })
})
