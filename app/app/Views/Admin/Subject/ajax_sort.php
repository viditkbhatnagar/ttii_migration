<style>
    .modal-body {
        background-color: #E1EBE9 !important;
    }
</style>

<?php if (!empty($subjects)){ ?>

<form id="subject-form"  enctype="multipart/form-data" method="post">
    <div class="row" id="subject-list">
        <input type="hidden" value="<?=$course_id?>" id="course_id" >
        
        <?php foreach ($subjects as $key => $sub) { ?>
            <div class="col-lg-12 p-2">
                <div>
                    <div class="card mb-0 mt-2 draggable-item" id="<?php echo $sub['id']; ?>">
                        <div class="card-body">
                            <div class="media">
                                <div class="media-body">
                                    <h5 class="mb-1 mt-0"> <?= $sub['title'] ?> </h5>
                                </div> <!-- end media-body -->
                            </div> <!-- end media -->
                        </div> <!-- end card-body -->
                    </div> <!-- end col -->
                </div>
            </div>
        <?php } ?>

        <div class="col-12 p-2">
            <button id="save-order-btn" class="btn btn-success float-end btn-save" type="button">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

<?php } ?>
<script>

var base_url = '<?=base_url('admin/')?>';


    // Initialize SortableJS
    var sortable = new Sortable(document.getElementById('subject-list'), {
        animation: 150,
        onEnd: function(evt) {
            // Callback function when sorting ends
            // You can perform actions here, such as updating the order in the database
            // alert("Subject order changed!");
        }
    });
    
    document.getElementById('save-order-btn').addEventListener('click', function() {
        var subjectOrder = [];
        var subjectCards = document.querySelectorAll('.draggable-item');
        
        // Iterate over subject cards to extract their IDs
        subjectCards.forEach(function(card) {
            subjectOrder.push(card.id);
        });
        
        
        var course_id = $("#course_id").val();
        console.log('Subject order:', subjectOrder); // Debugging
    
        $.ajax({
            url: base_url + 'Subject/updateOrder',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ subjectOrder: subjectOrder }),
            success: function(data) {
                console.log('Order updated successfully:', data);
                // Optionally, redirect or show a success message
                window.location.href = base_url+'course/details/'+course_id;
            },
            error: function(xhr, status, error) {
                console.error('Error updating order:', error);
                // Optionally, show an error message
            }
        });

    });

    
    
    
</script>

