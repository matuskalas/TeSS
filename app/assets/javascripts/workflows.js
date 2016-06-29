var cy;

$(document).ready(function () {
    var wfJsonElement = $('#workflow-content-json');
    var cytoscapeElement = $('#cy');

    if (wfJsonElement.length && cytoscapeElement.length) {
        cy = window.cy = cytoscape({
            container: cytoscapeElement[0],
            elements: JSON.parse(wfJsonElement.html()),
            layout: {
                name: 'preset',
                padding: 20
            },
            style: [
                {
                    selector: 'node',
                    css: {
                        'shape': 'roundrectangle',
                        'content': 'data(name)',
                        'background-color': 'data(color)',
                        'background-opacity': 0.8,
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': '150px',
                        'height': '30px',
                        'font-size': '9px',
                        'border-width': '1px',
                        'border-color': '#000',
                        'border-opacity': 0.5
                    }
                },
                {
                    selector: '$node > node',
                    css: {
                        'shape': 'roundrectangle',
                        'padding-top': '10px',
                        'font-weight': 'bold',
                        'padding-left': '10px',
                        'padding-bottom': '10px',
                        'padding-right': '10px',
                        'text-valign': 'top',
                        'text-halign': 'center',
                        'width': 'auto',
                        'height': 'auto',
                        'font-size': '9px'
                    }
                },
                {
                    selector: 'edge',
                    css: {
                        'target-arrow-shape': 'triangle',
                        'content': 'data(name)',
                        'line-color': '#ccc',
                        'source-arrow-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'font-size': '9px'
                    }
                },
                {
                    selector: ':selected',
                    css: {
                        'line-color': '#2A62E4',
                        'target-arrow-color': '#2A62E4',
                        'source-arrow-color': '#2A62E4',
                        'border-width': '2px',
                        'border-color': '#2A62E4',
                        'border-opacity': 1,
                        'background-blacken': '-0.1'
                    }
                }
            ],
            userZoomingEnabled: false,
            autolock: !cytoscapeElement.data('editable')
        });

        cy.panzoom();
    }

    $('#workflow-toolbar-add').click(Workflows.setAddNodeState);
    $('#workflow-toolbar-cancel').click(Workflows.cancelState);
    $('#workflow-toolbar-edit').click(Workflows.editNode);
    $('#workflow-toolbar-link').click(Workflows.setLinkNodeState);
    $('#workflow-toolbar-undo').click(Workflows.history.undo);
    $('#workflow-toolbar-redo').click(Workflows.history.redo);
    $('#workflow-toolbar-add-child').click(Workflows.addChild);
    $('#workflow-toolbar-delete').click(Workflows.deleteNode);
    $('#workflow-modal-form-confirm').click(Workflows.modalConfirm);
    cy.on('tap', Workflows.handleClick);
    cy.on('select', function (e) {
        if (Workflows.state !== 'adding node') {
            Workflows.selectNode(e.cyTarget);
        }
    });
    cy.on('unselect', Workflows.cancelState);
    cy.on('free', function () { Workflows.history.modify('move node') });

    $('#workflow-modal').on('hide.bs.modal', Workflows.cancelState);

    // Update JSON in form
    $('#workflow-form-submit').click(function () {
        $('#workflow_workflow_content').val(JSON.stringify(cy.json()['elements']));

        return true;
    });

    cy.$(':selected').unselect();
    Workflows.cancelState();
    Workflows.history.initialize();
});

Workflows = {
    setAddNodeState: function () {
        Workflows.cancelState();
        Workflows.setState('adding node', 'Click on the diagram to add a new node.');
    },

    placeNode: function (position, parentId) {
        $('#workflow-modal-title').html(parentId ? 'Add child node' : 'Add node');
        $('#workflow-modal').modal('show');
        $('#workflow-modal-form-id').val('');
        $('#workflow-modal-form-title').val('');
        $('#workflow-modal-form-description').val('');
        $('#workflow-modal-form-colour').val('#f0721e')[0].jscolor.fromString('#f0721e');
        $('#workflow-modal-form-parent-id').val(parentId);
        $('#workflow-modal-form-x').val(position.x);
        // Offset child nodes a bit so they don't stack on top of each other...
        var y = position.y;
        if (parentId && Workflows.selectedNode.children().length > 0)
            y = Workflows.selectedNode.children().last().position().y + 40;
        $('#workflow-modal-form-y').val(y);
    },

    addNode: function () {
        var object = {
            group: 'nodes',
            data: {
                name: $('#workflow-modal-form-title').val(),
                description: $('#workflow-modal-form-description').val(),
                color: $('#workflow-modal-form-colour').val(),
                parent: $('#workflow-modal-form-parent-id').val()
            },
            position: {
                x: parseInt($('#workflow-modal-form-x').val()),
                y: parseInt($('#workflow-modal-form-y').val())
            }
        };

        $('#workflow-modal').modal('hide');

        Workflows.history.modify('add node', function () {
            cy.add(object).select();
        });
    },

    updateNode: function () {
        var node = Workflows.selectedNode;
        Workflows.history.modify('edit node', function () {
            node.data('name', $('#workflow-modal-form-title').val());
            node.data('description', $('#workflow-modal-form-description').val());
            node.data('color', $('#workflow-modal-form-colour').val());
        });

        $('#workflow-modal').modal('hide');
        node.select();
    },


    cancelState: function () {
        Workflows.state = '';

        if (Workflows.selectedNode) {
            Workflows.selectedNode.unselect();
            Workflows.selectedNode = null;
        }

        $('#workflow-status-message').html('');
        $('#workflow-status-selected-node').html('<span class="muted">nothing</span>');
        $('#workflow-status-bar').find('.node-context-button').hide();
        $('#workflow-toolbar-cancel').hide();
    },

    setState: function (state, message) {
        Workflows.state = state;
        $('#workflow-status-message').html(message);
        var button = $('#workflow-toolbar-cancel');
        button.find('span').html('Cancel ' + state);
        button.show();
    },

    selectNode: function (node) {
        Workflows.selectedNode = node;
        Workflows.setState('node selection');
        $('#workflow-status-bar').find('.node-context-button').show();
        $('#workflow-status-selected-node').html(Workflows.selectedNode.data('name'));
    },

    editNode: function () {
        if (Workflows.state === 'node selection') {
            var data = Workflows.selectedNode.data();
            var position = Workflows.selectedNode.position();
            $('#workflow-modal-title').html('Edit node');
            $('#workflow-modal').modal('show');
            $('#workflow-modal-form-id').val(data.id);
            $('#workflow-modal-form-title').val(data.name);
            $('#workflow-modal-form-description').val(data.description);
            $('#workflow-modal-form-colour').val(data.color)[0].jscolor.fromString(data.color);
            $('#workflow-modal-form-parent-id').val(data.parent);
            $('#workflow-modal-form-x').val(position.x);
            $('#workflow-modal-form-y').val(position.y);
        }
    },

    modalConfirm: function () {
        if ($('#workflow-modal-form-id').val()) {
            Workflows.updateNode();
        } else {
            Workflows.addNode();
        }
    },

    setLinkNodeState: function () {
        Workflows.setState('linking node', 'Click on a node to create a link.');
    },

    createLink: function (e) {
        Workflows.history.modify('link', function () {
            e.cy.add({
                group: "edges",
                data: {
                    source: Workflows.selectedNode.data('id'),
                    target: e.cyTarget.data('id')
                }
            });
        });

        Workflows.cancelState();
    },

    handleClick: function (e) {
        if (Workflows.state === 'adding node') {
            Workflows.placeNode(e.cyPosition);
        } else if (Workflows.state === 'linking node') {
            if (e.cyTarget !== cy && e.cyTarget.isNode()) {
                Workflows.createLink(e);
            }
        }
    },

    addChild: function () {
        Workflows.placeNode(Workflows.selectedNode.position(), Workflows.selectedNode.id());
    },

    deleteNode: function () {
        if (confirm('Are you sure you wish to delete this node?')) {
            Workflows.selectedNode.remove();
            Workflows.cancelState();
        }
    },

    history: {
        initialize: function () {
            Workflows.history.index = 0;
            Workflows.history.stack = [{ action: 'initial state', elements: cy.elements().clone() }];
        },

        modify: function (action, modification) {
            Workflows.history.stack.length = Workflows.history.index + 1; // Removes all "future" history after the current point.
            Workflows.history.index++;
            Workflows.history.stack.push({ action: action, elements: cy.elements().clone() });
            if (typeof modification != 'undefined')
                modification();
            Workflows.history.setButtonState();
        },

        undo: function () {
            if (Workflows.history.index > 0) {
                Workflows.history.index--;
                Workflows.history.restore();
            }
        },

        redo: function () {
            if (Workflows.history.index < (Workflows.history.stack.length - 1)) {
                Workflows.history.index++;
                Workflows.history.restore();
            }
        },

        restore: function () {
            cy.elements().remove();
            Workflows.history.stack[Workflows.history.index].elements.restore();
            Workflows.history.setButtonState();
        },

        setButtonState: function () {
            if (Workflows.history.index < (Workflows.history.stack.length - 1)) {
                $('#workflow-toolbar-redo')
                    .removeClass('disabled')
                    .find('span')
                    .attr('title', 'Redo ' + Workflows.history.stack[Workflows.history.index + 1].action);
            } else {
                $('#workflow-toolbar-redo')
                    .addClass('disabled')
                    .find('span')
                    .attr('title', 'Redo');
            }

            if (Workflows.history.index > 0) {
                $('#workflow-toolbar-undo')
                    .removeClass('disabled')
                    .find('span')
                    .attr('title', 'Undo ' + Workflows.history.stack[Workflows.history.index].action);
            } else {
                $('#workflow-toolbar-undo')
                    .addClass('disabled')
                    .find('span')
                    .attr('title', 'Undo');
            }
        }
    }
};
