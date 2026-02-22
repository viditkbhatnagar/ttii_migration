<form action="<?=base_url('admin/course/add_key_learning/'.$course_id)?>" enctype="multipart/form-data" method="post">
    <div class="d-flex justify-content-end">
        <button type="button" class="btn btn-primary" id="add-key-learning">
            <i class="ri-add-fill"></i> Add
        </button>
    </div>
    <div id="key-learning-container">
        <div class="row key-learning-item position-relative">
            <div class="col-lg-11 p-2">
                <label for="title" class="form-label">Key Learning<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" name="title[]" placeholder="Key Learning" required>
            </div>
            <!--<div class="col-lg-5 p-2">-->
            <!--    <label for="image" class="form-label">Image</label>-->
            <!--    <input class="form-control" type="file" name="image[]" />-->
            <!--</div>-->
            <!-- Compact, circular remove button -->
            <div class="col-lg-1 p-2 d-flex align-item-center">
                <button type="button" class="btn btn-remove" style="display: none;">
                    <i class="ri-close-fill"></i>
                </button>
            </div>
        </div>
    </div>
    
    <div class="col-12 p-2">
        <button class="btn btn-success float-end btn-save" type="submit">
            <i class="ri-check-fill"></i> Save
        </button>
    </div>
</form>

<style>
    .btn-remove {
        width: 24px;
        height: 24px;
        padding: 0;
        border-radius: 50%;
        background-color: #ff5c5c;
        color: white;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }

    .btn-remove:hover {
        background-color: #ff4040;
    }
</style>

<script>
document.getElementById('add-key-learning').addEventListener('click', function() {
    const container = document.getElementById('key-learning-container');
    const firstItem = document.querySelector('.key-learning-item');
    const newItem = firstItem.cloneNode(true);
    
    // Clear input values in the cloned item
    newItem.querySelector('input[name="title[]"]').value = '';
    // newItem.querySelector('input[name="image[]"]').value = '';
    
    // Add event listener to the new "Remove" button
    newItem.querySelector('.btn-remove').addEventListener('click', function() {
        newItem.remove();
        toggleRemoveButtons();
    });

    // Append the new item and toggle "Remove" buttons
    container.appendChild(newItem);
    toggleRemoveButtons();
});

// Add event listener to the "Remove" button in the initial item
document.querySelector('.btn-remove').addEventListener('click', function() {
    this.closest('.key-learning-item').remove();
    toggleRemoveButtons();
});

// Function to toggle the visibility of "Remove" buttons
function toggleRemoveButtons() {
    const items = document.querySelectorAll('.key-learning-item');
    const removeButtons = document.querySelectorAll('.btn-remove');
    
    if (items.length > 1) {
        removeButtons.forEach(button => button.style.display = 'flex');
    } else {
        removeButtons.forEach(button => button.style.display = 'none');
    }
}

// Initial call to ensure correct "Remove" button visibility
toggleRemoveButtons();
</script>
