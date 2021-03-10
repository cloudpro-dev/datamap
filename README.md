# FieldView

FieldView is a software solution for visualising the mapping of data between one system and another.

In even the most simple of integrated solutions you will find that data is continually mapped between one solution and another.  A good example of such a mapping is an API which presents data in one form and an application which consumes that data.  The consuming application is unlikely to have the same format as the incoming data and as such some mapping will occur.  When this mapping happens occurs over more than one layer it can become difficult to track this mappings.

## Terminology

### Diagram
A diagram contains many schemas and has an orthagonal layout with edge grouping.

### Schemas
A [JSON Schema](https://json-schema.org/) which represents part of a data model in one of the systems you are trying to map.

The schema can represent either flat or hierarchical data.

### Fields
Each schema contains a number of `Field` definitions.  The minimum information that can be defined for a `Field` is `name` and `type`.

### Maps
A JSON document which uses JSON Pointers to map fields between the different schemas.

### Views
A JSON document which defines which `Schema` to display.

![View Conceptual Design](images/view-concept.png)

At present we will define the `View` using a JSON document but in the future expect to allow the user to visually select the Schema for inclusion in a `View` and to provide some kind of label for the `View`.  Future improvements would be to allow selection of Schema for the View by either/or/and:
- clicking the panel
- selecting from a multi-select list component e.g. list of checkboxes
- using a draggable area to capture fields to include

The user can have as many views as they like (selectable?).

Using a `View` you are able to display isolated sections of the overall `Map`.

Using a `View` you can define a default panel height and also the height of each panel individually.

## Ingestion
FieldView uses JSON schemas to represents each data source.

It is easy to generate JSON schemas using either pre-defined JSON data as a template or via an online converter to transform existing XSL//Flat to one.

Could we potentially use Machine Learning (ML) to improve this process so we can feed any type of file in and get a JSON schema out?

## Transformation
TODO - We need a mechanism for describing the transformation process between a `source Field` and a `destination Field`

Ordered list of `transformations` which is defined in the map against a `source` and `destination` field.

**How much of this would overlap with a Rules Engine?**

```
"input1": {
    "source": {
        "$ref": "schemas/test/a.schema.json#/properties/code"
    },
    "destination": {
        "$ref": "schemas/test/c.schema.json#/properties/aid"
    },
    tranformations: [
        // FUNCTIONS ARE NO GOOD FOR DESCRIBING A TRANSFORMATION (THEY WOULD PROVE USEFUL IN FIELD FLOW THOUGH!)
        (source) => {
            // this transforms data
            return source.replaceAll(' ', '-');
        }

        // WHAT IF WE DON'T USE A FUNCTION FOR THE DESCRIPTION
        // THESE COULD BE RUN IN A SET OF FUNCTIONS IF NEED BE!
        // CHAINING METHODS
        "source.replaceAll(' ', '-')",
        "source.toLowerCase()",
        "source.substring(0, source.indexOf('-'))",
    ]
}
```

# Backlog

The following tasks are considered in scope for this POC:

1. Line rendering improvements including flattened arrow ends as per the original ![Concept Design](images/introduction2.jpg)
2. Multi-select for fields in panel with dependency highlighting
3. Labellng improvments including labels on arrows using the name of the key from the map, and multiplicity shown on the arrow ends
4. Schema view mode which shows the dependencies between the schemas but does not show the fields
5. Use flexbox for toolbar layout

6. Design concept of a `View` which defines a list of schemas to load, instead of just scraping the Map for all fields
7. Add `height` attribute to View definition files which allows manual adjustment of the Panel height
8. Meta data for fields defined in a Schema that can store additional information e.g. UI field name, technical label, description, etc (use seperate `meta` element for data)
9. Design a way of *defining* and *visualing* any transformation between a source and destination field
10. Add some visual grouping and/or labels that represent groups to allow easier identification of which system each schema resides within
11. Load mask for initial display

12. Multipicity labels on the schema view between entities, either end of the connector

12. Manual ordering for the fields within a panel using DnD (currently only available via `Map` file definition)
13. Custom layout mode for the schema Panels using DnD to position
14. Vertical resizable panels by dragging edges (currently only available via `height` attribute of schema)
15. Auto-complete for the search field which allows you to quickly select just a single field
16. Mini-map which allows dragging around the diagram
17. Pre-defined zoom levels
18. Pop-up menu on Panel to show information, allow actions, etc

# Defects

**When we order the fields (or anytime we show/hide fields) we start to see a delay when using the scroll bar**
This is indicative of a memory leak, probably caused by the refresh of SVG arrows or too many listeners on the DOM elements that are not getting cleaned up as the fields are getting hidden.
_Investigation required_

# Field Flow

The ability to simulate data going through the model.  Pass some data into the model at some point and get a value out from another point with all the transformation applied.

# Field Rules

Rules engine which maps rules to fields in the schemas.
Rules are defined in a seperate set of files to the schemas.