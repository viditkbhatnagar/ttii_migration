<style>
    .modal-body {
        background-color: #E1EBE9 !important;
    }
    
    .card-body {
        border-radius : 4px !important;
        
    }
</style>

<?php if (!empty($lesson_files)){ ?>

<form id="lesson-form"  >
    <div class="row" id="lesson-list">
        
        <input type="hidden" value="<?=$lesson_id?>" id="lesson_id" >
        <input type="hidden" value="<?=$subject_id?>" id="subject_id" >
        <input type="hidden" value="<?=$course_id?>" id="course_id" >
        
        <?php foreach ($lesson_files as $key => $les) { ?>
            <div class="col-lg-12 p-2">
                <div>
                    <div class="card mb-0 mt-2 draggable-item" id="<?php echo $les['id']; ?>">
                        <div class="card-body">
                            <div class="media">
                                <div class="media-body">
                                    <h5 class="mb-1 mt-0"> <?= $les['title'] ?> </h5>
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
    var sortable = new Sortable(document.getElementById('lesson-list'), {
        animation: 150,
        onEnd: function(evt) {
            // Callback function when sorting ends
            // You can perform actions here, such as updating the order in the database
            // alert("lesson order changed!");
        }
    });
    
    document.getElementById('save-order-btn').addEventListener('click', function() {
        var lessonOrder = [];
        var lessonCards = document.querySelectorAll('.draggable-item');
        
        // Iterate over lesson cards to extract their IDs
        lessonCards.forEach(function(card) {
            lessonOrder.push(card.id);
        });
        
        
        var subject_id = $("#subject_id").val();
        console.log('lesson order:', lessonOrder); // Debugging
    
        $.ajax({
            url: base_url + 'lesson_files/updateOrder',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ lessonOrder: lessonOrder }),
            success: function(data) {
                console.log('Order updated successfully:', data);
                // Optionally, redirect or show a success message
                window.location.href = base_url+'course_new/index/'+subject_id;
            },
            error: function(xhr, status, error) {
                console.error('Error updating order:', error);
                // Optionally, show an error message
            }
        });

    });

    
    
    
</script>

